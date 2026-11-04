#pragma once
// Fixed-window rate limiter keyed by string (client IP, pid). Thread-safe, memory bounded.
#include <chrono>
#include <cstdint>
#include <mutex>
#include <string>
#include <unordered_map>

class RateLimiter {
 public:
  RateLimiter(int max_hits, std::chrono::seconds window) : max_(max_hits), window_(window) {}

  // Returns true if the request is allowed (and counts it).
  bool allow(const std::string& key) {
    auto now = std::chrono::steady_clock::now();
    std::lock_guard<std::mutex> lk(mu_);
    if (m_.size() > kMaxKeys) prune(now);
    auto& e = m_[key];
    if (now - e.start >= window_) {
      e.start = now;
      e.hits = 0;
    }
    return ++e.hits <= max_;
  }

 private:
  struct Slot {
    std::chrono::steady_clock::time_point start{};
    int hits = 0;
  };
  static constexpr size_t kMaxKeys = 20000;
  void prune(std::chrono::steady_clock::time_point now) {
    for (auto it = m_.begin(); it != m_.end();) {
      if (now - it->second.start >= window_) it = m_.erase(it);
      else ++it;
    }
    if (m_.size() > kMaxKeys) m_.clear();  // still flooded with live keys: reset rather than grow
  }
  int max_;
  std::chrono::seconds window_;
  std::mutex mu_;
  std::unordered_map<std::string, Slot> m_;
};
