// Redis-backed leaderboard (hiredis) using a Sorted Set and ZADD GT.
// Falls back to memory while Redis is unreachable.
#include <hiredis/hiredis.h>

#include <chrono>
#include <cstdio>
#include <cstdlib>

#include "store.h"

namespace {

const char* kKey = "science26:leaderboard";

class RedisLeaderboard : public Leaderboard {
 public:
  explicit RedisLeaderboard(std::string url) : url_(std::move(url)) {
    std::lock_guard<std::mutex> lk(mu_);
    ensure_locked(true);
  }
  ~RedisLeaderboard() override {
    if (ctx_) redisFree(ctx_);
  }

  void submit(const std::string& name, double score) override {
    {
      std::lock_guard<std::mutex> lk(mu_);
      if (ensure_locked(false)) {
        char buf[64];
        std::snprintf(buf, sizeof buf, "%.17g", score);
        auto* r = static_cast<redisReply*>(
            redisCommand(ctx_, "ZADD %s GT %s %b", kKey, buf, name.data(), name.size()));
        bool ok = r && r->type != REDIS_REPLY_ERROR;
        if (r) freeReplyObject(r);
        if (ok) return;
        drop_locked();
      }
    }
    fallback_.submit(name, score);
  }

  std::vector<Entry> top(int limit) override {
    {
      std::lock_guard<std::mutex> lk(mu_);
      if (ensure_locked(false)) {
        auto* r = static_cast<redisReply*>(
            redisCommand(ctx_, "ZREVRANGE %s 0 %d WITHSCORES", kKey, limit - 1));
        if (r && r->type == REDIS_REPLY_ARRAY) {
          std::vector<Entry> v;
          for (size_t i = 0; i + 1 < r->elements; i += 2) {
            v.emplace_back(std::string(r->element[i]->str, r->element[i]->len),
                           std::strtod(r->element[i + 1]->str, nullptr));
          }
          freeReplyObject(r);
          return v;
        }
        if (r) freeReplyObject(r);
        drop_locked();
      }
    }
    return fallback_.top(limit);
  }

  bool connected() override {
    std::lock_guard<std::mutex> lk(mu_);
    if (!ensure_locked(false)) return false;
    auto* r = static_cast<redisReply*>(redisCommand(ctx_, "PING"));  // detect dead connections
    bool ok = r && r->type != REDIS_REPLY_ERROR;
    if (r) freeReplyObject(r);
    if (!ok) {
      drop_locked();
      return ensure_locked(false);
    }
    return true;
  }

 private:
  void drop_locked() {
    if (ctx_) redisFree(ctx_);
    ctx_ = nullptr;
  }

  bool ensure_locked(bool force) {
    if (ctx_ && !ctx_->err) return true;
    auto now = std::chrono::steady_clock::now();
    if (!force && now - last_try_ < std::chrono::seconds(3)) return false;
    last_try_ = now;
    drop_locked();
    struct timeval tv = {2, 0};
    // hiredis has no URL parser in older versions; parse redis://[:pw@]host[:port][/db].
    std::string s = url_, host, pass;
    int port = 6379, db = 0;
    auto sch = s.find("://");
    if (sch != std::string::npos) s = s.substr(sch + 3);
    auto slash = s.find('/');
    if (slash != std::string::npos) {
      std::string d = s.substr(slash + 1);
      if (!d.empty()) db = std::atoi(d.c_str());
      s = s.substr(0, slash);
    }
    auto at = s.rfind('@');
    if (at != std::string::npos) {
      std::string cred = s.substr(0, at);
      auto colon = cred.find(':');
      pass = colon == std::string::npos ? cred : cred.substr(colon + 1);
      s = s.substr(at + 1);
    }
    auto colon = s.rfind(':');
    if (colon != std::string::npos && s.find(']') == std::string::npos) {
      port = std::atoi(s.c_str() + colon + 1);
      host = s.substr(0, colon);
    } else {
      host = s;
    }
    if (host.empty()) host = "127.0.0.1";
    ctx_ = redisConnectWithTimeout(host.c_str(), port, tv);
    if (!ctx_ || ctx_->err) {
      std::fprintf(stderr, "redis connect failed: %s\n", ctx_ ? ctx_->errstr : "oom");
      drop_locked();
      return false;
    }
    redisSetTimeout(ctx_, tv);
    if (!pass.empty() && !cmd_ok("AUTH %s", pass.c_str())) return false;
    if (db > 0 && !cmd_ok("SELECT %d", db)) return false;
    std::fprintf(stderr, "redis connected\n");
    return true;
  }

  bool cmd_ok(const char* fmt, const char* a) {
    auto* r = static_cast<redisReply*>(redisCommand(ctx_, fmt, a));
    bool ok = r && r->type != REDIS_REPLY_ERROR;
    if (r) freeReplyObject(r);
    if (!ok) drop_locked();
    return ok;
  }
  bool cmd_ok(const char* fmt, int a) {
    auto* r = static_cast<redisReply*>(redisCommand(ctx_, fmt, a));
    bool ok = r && r->type != REDIS_REPLY_ERROR;
    if (r) freeReplyObject(r);
    if (!ok) drop_locked();
    return ok;
  }

  std::string url_;
  std::mutex mu_;
  redisContext* ctx_ = nullptr;
  std::chrono::steady_clock::time_point last_try_{};
  MemoryLeaderboard fallback_;
};

}  // namespace

std::unique_ptr<Leaderboard> make_leaderboard(const std::string& redis_url) {
  if (redis_url.empty()) return std::make_unique<MemoryLeaderboard>();
  return std::make_unique<RedisLeaderboard>(redis_url);
}
