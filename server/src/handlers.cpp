#include "handlers.h"

#include <nlohmann/json.hpp>

#include <chrono>
#include <cmath>
#include <cstdlib>

#include "ratelimit.h"
#include "validate.h"

using json = nlohmann::json;

namespace {

void reply(httplib::Response& res, int status, const json& body) {
  res.status = status;
  res.set_content(body.dump(-1, ' ', false, json::error_handler_t::replace), "application/json");
}

void error(httplib::Response& res, int status, const char* code) {
  reply(res, status, json{{"error", code}});
}

int64_t now_ms() {
  return std::chrono::duration_cast<std::chrono::milliseconds>(
             std::chrono::system_clock::now().time_since_epoch())
      .count();
}

// Client address as seen behind nginx (X-Real-IP is set by web/nginx.conf); falls back to the socket peer.
std::string client_key(const httplib::Request& req) {
  std::string ip = req.get_header_value("X-Real-IP");
  return ip.empty() ? req.remote_addr : ip.substr(0, 64);
}

bool too_many(httplib::Response& res, RateLimiter& rl, const std::string& key) {
  if (rl.allow(key)) return false;
  res.set_header("Retry-After", "10");
  error(res, 429, "rate_limited");
  return true;
}

// If-Match: "<updatedAt>" (quotes optional). Returns false when present but malformed.
bool parse_if_match(const httplib::Request& req, int64_t& out) {
  out = -1;
  std::string v = req.get_header_value("If-Match");
  if (v.empty()) return true;
  if (v.size() >= 2 && v.front() == '"' && v.back() == '"') v = v.substr(1, v.size() - 2);
  if (v.empty() || v.size() > 18) return false;
  for (unsigned char c : v)
    if (c < '0' || c > '9') return false;
  out = std::atoll(v.c_str());
  return true;
}

json score_json(double s) {
  if (std::floor(s) == s && std::fabs(s) < 9e15) return static_cast<int64_t>(s);
  return s;
}

}  // namespace

void register_routes(httplib::Server& svr, SaveStore& saves, Leaderboard& board) {
  svr.set_payload_max_length(kMaxSaveBytes + 1024);  // JSON envelope slack; exact check in handler

  // Limits are per client IP; saves are additionally throttled per pid. The client saves at most every 10 s.
  static RateLimiter put_ip(30, std::chrono::seconds(60));
  static RateLimiter put_pid(1, std::chrono::seconds(1));
  static RateLimiter get_ip(120, std::chrono::seconds(60));
  static RateLimiter score_ip(20, std::chrono::seconds(60));

  svr.Get("/api/health", [&](const httplib::Request&, httplib::Response& res) {
    reply(res, 200, json{{"ok", true}, {"db", saves.connected()}, {"redis", board.connected()}});
  });

  svr.Get(R"(/api/save/([^/]*))", [&](const httplib::Request& req, httplib::Response& res) {
    std::string pid = req.matches[1];
    if (!valid_pid(pid)) return error(res, 400, "invalid_pid");
    if (too_many(res, get_ip, client_key(req))) return;
    std::string data;
    int64_t ts = 0;
    if (!saves.get(pid, data, ts)) return error(res, 404, "not_found");
    json d = json::parse(data, nullptr, false);
    if (d.is_discarded()) return error(res, 500, "corrupt_data");
    reply(res, 200, json{{"data", d}, {"updatedAt", ts}});
  });

  svr.Put(R"(/api/save/([^/]*))", [&](const httplib::Request& req, httplib::Response& res) {
    std::string pid = req.matches[1];
    if (!valid_pid(pid)) return error(res, 400, "invalid_pid");
    if (req.body.size() > kMaxSaveBytes) return error(res, 413, "payload_too_large");
    if (too_many(res, put_ip, client_key(req)) || too_many(res, put_pid, pid)) return;
    int64_t expected = -1;
    if (!parse_if_match(req, expected)) return error(res, 400, "invalid_if_match");
    if (!json_depth_ok(req.body)) return error(res, 400, "too_deep");
    json d = json::parse(req.body, nullptr, false);
    if (d.is_discarded() || !d.is_object()) return error(res, 400, "invalid_json");
    // A real save always has these; blocks `{}` / junk from overwriting a good save.
    auto base = d.find("base");
    auto ver = d.find("ver");
    if (base == d.end() || !base->is_array() || ver == d.end() || !ver->is_number())
      return error(res, 400, "invalid_save");
    std::string text = d.dump(-1, ' ', false, json::error_handler_t::replace);
    if (has_nul_escape(text)) return error(res, 400, "invalid_json");  // JSONB cannot store \u0000
    int64_t ts = now_ms(), current = 0;
    switch (saves.put(pid, text, ts, expected, &current)) {
      case PutResult::kOk:
        return reply(res, 200, json{{"ok", true}, {"updatedAt", ts}});
      case PutResult::kConflict:  // another tab/device saved newer progress
        return reply(res, 409, json{{"error", "conflict"}, {"updatedAt", current}});
      case PutResult::kFailed:
        return error(res, 503, "store_failed");
    }
  });

  svr.Post("/api/score", [&](const httplib::Request& req, httplib::Response& res) {
    if (req.body.size() > 4096) return error(res, 413, "payload_too_large");
    if (too_many(res, score_ip, client_key(req))) return;
    if (!json_depth_ok(req.body)) return error(res, 400, "too_deep");
    json d = json::parse(req.body, nullptr, false);
    if (d.is_discarded() || !d.is_object()) return error(res, 400, "invalid_json");
    auto n = d.find("name");
    auto s = d.find("score");
    if (n == d.end() || !n->is_string() || !valid_name(n->get<std::string>()))
      return error(res, 400, "invalid_name");
    if (s == d.end() || !s->is_number()) return error(res, 400, "invalid_score");
    double score = s->get<double>();
    if (!std::isfinite(score) || score < 0 || score > kMaxScore) return error(res, 400, "invalid_score");
    board.submit(n->get<std::string>(), score);
    reply(res, 200, json{{"ok", true}});
  });

  svr.Get("/api/leaderboard", [&](const httplib::Request& req, httplib::Response& res) {
    int limit = 10;
    if (req.has_param("limit") && !parse_limit(req.get_param_value("limit"), limit))
      return error(res, 400, "invalid_limit");
    json arr = json::array();
    for (const auto& e : board.top(limit))
      arr.push_back(json{{"name", e.first}, {"score", score_json(e.second)}});
    reply(res, 200, arr);
  });

  // Unmatched routes and library-generated errors (404, 413, ...) as JSON.
  svr.set_error_handler([](const httplib::Request&, httplib::Response& res) {
    if (!res.body.empty()) return;
    const char* code = res.status == 404   ? "not_found"
                       : res.status == 413 ? "payload_too_large"
                       : res.status == 405 ? "method_not_allowed"
                                           : "error";
    res.set_content(json{{"error", code}}.dump(), "application/json");
  });

  svr.set_exception_handler([](const httplib::Request&, httplib::Response& res, std::exception_ptr) {
    res.status = 500;
    res.set_content(R"({"error":"internal"})", "application/json");
  });
}
