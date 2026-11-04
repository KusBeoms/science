#pragma once
// Storage interfaces. Every implementation is thread-safe.
#include <cstdint>
#include <map>
#include <memory>
#include <mutex>
#include <string>
#include <utility>
#include <vector>

using Entry = std::pair<std::string, double>;  // name, score

// Result of a save write. kConflict: expected_ts did not match the stored version.
// kFailed: the store rejected the write (e.g. data error) - never silently dropped.
enum class PutResult { kOk, kConflict, kFailed };

class SaveStore {
 public:
  virtual ~SaveStore() = default;
  // json: serialized JSON object. Returns false when not found.
  virtual bool get(const std::string& pid, std::string& json, int64_t& updated_at) = 0;
  // expected_ts < 0: unconditional write. Otherwise write only if the stored version
  // equals expected_ts (or no save exists yet); on kConflict *current is set to the stored version.
  virtual PutResult put(const std::string& pid, const std::string& json, int64_t updated_at,
                        int64_t expected_ts, int64_t* current) = 0;
  virtual bool connected() = 0;  // true if backed by a live PostgreSQL connection
};

class Leaderboard {
 public:
  virtual ~Leaderboard() = default;
  // Keeps only the highest score per name.
  virtual void submit(const std::string& name, double score) = 0;
  virtual std::vector<Entry> top(int limit) = 0;
  virtual bool connected() = 0;  // true if backed by a live Redis connection
};

class MemorySaveStore : public SaveStore {
 public:
  bool get(const std::string& pid, std::string& json, int64_t& updated_at) override;
  PutResult put(const std::string& pid, const std::string& json, int64_t updated_at,
                int64_t expected_ts, int64_t* current) override;
  bool connected() override { return false; }

 private:
  static constexpr size_t kMaxSaves = 50000;  // bounds memory when no DB is configured
  std::mutex mu_;
  std::map<std::string, std::pair<std::string, int64_t>> m_;
};

class MemoryLeaderboard : public Leaderboard {
 public:
  void submit(const std::string& name, double score) override;
  std::vector<Entry> top(int limit) override;
  bool connected() override { return false; }

 private:
  std::mutex mu_;
  std::map<std::string, double> m_;
};

// Factories. Return the memory implementation when url is empty; the
// PostgreSQL/Redis versions fall back to memory while disconnected.
std::unique_ptr<SaveStore> make_save_store(const std::string& database_url);
std::unique_ptr<Leaderboard> make_leaderboard(const std::string& redis_url);
