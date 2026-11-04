#include <algorithm>

#include "store.h"

bool MemorySaveStore::get(const std::string& pid, std::string& json, int64_t& updated_at) {
  std::lock_guard<std::mutex> lk(mu_);
  auto it = m_.find(pid);
  if (it == m_.end()) return false;
  json = it->second.first;
  updated_at = it->second.second;
  return true;
}

PutResult MemorySaveStore::put(const std::string& pid, const std::string& json, int64_t updated_at,
                               int64_t expected_ts, int64_t* current) {
  std::lock_guard<std::mutex> lk(mu_);
  auto it = m_.find(pid);
  if (it == m_.end()) {
    if (m_.size() >= kMaxSaves) return PutResult::kFailed;
  } else if (expected_ts >= 0 && it->second.second != expected_ts) {
    if (current) *current = it->second.second;
    return PutResult::kConflict;
  }
  m_[pid] = {json, updated_at};
  return PutResult::kOk;
}

void MemoryLeaderboard::submit(const std::string& name, double score) {
  std::lock_guard<std::mutex> lk(mu_);
  auto it = m_.find(name);
  if (it == m_.end() || score > it->second) m_[name] = score;
}

std::vector<Entry> MemoryLeaderboard::top(int limit) {
  std::vector<Entry> v;
  {
    std::lock_guard<std::mutex> lk(mu_);
    v.assign(m_.begin(), m_.end());
  }
  std::sort(v.begin(), v.end(), [](const Entry& a, const Entry& b) {
    return a.second != b.second ? a.second > b.second : a.first < b.first;
  });
  if (limit >= 0 && static_cast<size_t>(limit) < v.size()) v.resize(limit);
  return v;
}
