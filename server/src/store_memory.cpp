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

void MemorySaveStore::put(const std::string& pid, const std::string& json, int64_t updated_at) {
  std::lock_guard<std::mutex> lk(mu_);
  m_[pid] = {json, updated_at};
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
