// PostgreSQL-backed save store (libpq). Falls back to memory while the DB is
// unreachable; reconnects lazily (rate-limited) on later requests.
#include <libpq-fe.h>

#include <chrono>
#include <cstdio>
#include <cstdlib>

#include "store.h"

namespace {

class PgSaveStore : public SaveStore {
 public:
  explicit PgSaveStore(std::string url) : url_(std::move(url)) {
    std::lock_guard<std::mutex> lk(mu_);
    ensure_locked(true);
  }
  ~PgSaveStore() override {
    if (conn_) PQfinish(conn_);
  }

  bool get(const std::string& pid, std::string& json, int64_t& updated_at) override {
    {
      std::lock_guard<std::mutex> lk(mu_);
      if (ensure_locked(false)) {
        const char* p[1] = {pid.c_str()};
        PGresult* r = PQexecParams(conn_, "SELECT data::text, updated_at FROM saves WHERE pid=$1",
                                   1, nullptr, p, nullptr, nullptr, 0);
        if (PQresultStatus(r) == PGRES_TUPLES_OK) {
          bool found = PQntuples(r) > 0;
          if (found) {
            json = PQgetvalue(r, 0, 0);
            updated_at = std::stoll(PQgetvalue(r, 0, 1));
          }
          PQclear(r);
          return found;
        }
        std::fprintf(stderr, "pg get failed: %s\n", PQerrorMessage(conn_));
        PQclear(r);
      }
    }
    return fallback_.get(pid, json, updated_at);
  }

  PutResult put(const std::string& pid, const std::string& json, int64_t updated_at,
                int64_t expected_ts, int64_t* current) override {
    {
      std::lock_guard<std::mutex> lk(mu_);
      if (ensure_locked(false)) {
        std::string ts = std::to_string(updated_at);
        std::string exp = std::to_string(expected_ts);
        const char* p[4] = {pid.c_str(), json.c_str(), ts.c_str(), exp.c_str()};
        // Compare-and-set in a single statement: with expected_ts < 0 the WHERE is always true.
        PGresult* r = PQexecParams(
            conn_,
            "INSERT INTO saves(pid,data,updated_at) VALUES($1,$2::jsonb,$3::bigint) "
            "ON CONFLICT (pid) DO UPDATE SET data=EXCLUDED.data, updated_at=EXCLUDED.updated_at "
            "WHERE $4::bigint < 0 OR saves.updated_at = $4::bigint",
            4, nullptr, p, nullptr, nullptr, 0);
        bool ok = PQresultStatus(r) == PGRES_COMMAND_OK;
        if (ok) {
          bool wrote = std::atoi(PQcmdTuples(r)) > 0;
          PQclear(r);
          if (wrote) return PutResult::kOk;
          const char* q[1] = {pid.c_str()};
          PGresult* c = PQexecParams(conn_, "SELECT updated_at FROM saves WHERE pid=$1", 1, nullptr, q,
                                     nullptr, nullptr, 0);
          if (current && PQresultStatus(c) == PGRES_TUPLES_OK && PQntuples(c) > 0)
            *current = std::stoll(PQgetvalue(c, 0, 0));
          PQclear(c);
          return PutResult::kConflict;
        }
        std::fprintf(stderr, "pg put failed: %s\n", PQerrorMessage(conn_));
        PQclear(r);
        // Connection still healthy -> the statement itself was rejected (bad data). Report it
        // instead of silently keeping the save in process memory (it would vanish on restart).
        if (PQstatus(conn_) == CONNECTION_OK) return PutResult::kFailed;
      }
    }
    return fallback_.put(pid, json, updated_at, expected_ts, current);
  }

  bool connected() override {
    std::lock_guard<std::mutex> lk(mu_);
    if (!ensure_locked(false)) return false;
    PGresult* r = PQexec(conn_, "SELECT 1");  // detect dead connections
    bool ok = PQresultStatus(r) == PGRES_TUPLES_OK;
    PQclear(r);
    if (!ok) return ensure_locked(false);  // PQstatus is now BAD -> reconnect (rate-limited)
    return true;
  }

 private:
  // Returns true if a healthy connection (with schema) is available.
  bool ensure_locked(bool force) {
    if (conn_ && PQstatus(conn_) == CONNECTION_OK) return true;
    auto now = std::chrono::steady_clock::now();
    if (!force && now - last_try_ < std::chrono::seconds(3)) return false;
    last_try_ = now;
    if (conn_) {
      PQfinish(conn_);
      conn_ = nullptr;
    }
    conn_ = PQconnectdb(url_.c_str());
    if (!conn_ || PQstatus(conn_) != CONNECTION_OK) {
      std::fprintf(stderr, "pg connect failed: %s\n", conn_ ? PQerrorMessage(conn_) : "oom");
      if (conn_) PQfinish(conn_);
      conn_ = nullptr;
      return false;
    }
    PGresult* r = PQexec(conn_,
                         "CREATE TABLE IF NOT EXISTS saves(pid TEXT PRIMARY KEY, "
                         "data JSONB NOT NULL, updated_at BIGINT NOT NULL)");
    bool ok = PQresultStatus(r) == PGRES_COMMAND_OK;
    if (!ok) std::fprintf(stderr, "pg schema failed: %s\n", PQerrorMessage(conn_));
    PQclear(r);
    if (!ok) {
      PQfinish(conn_);
      conn_ = nullptr;
      return false;
    }
    std::fprintf(stderr, "pg connected\n");
    return true;
  }

  std::string url_;
  std::mutex mu_;
  PGconn* conn_ = nullptr;
  std::chrono::steady_clock::time_point last_try_{};
  MemorySaveStore fallback_;
};

}  // namespace

std::unique_ptr<SaveStore> make_save_store(const std::string& database_url) {
  if (database_url.empty()) return std::make_unique<MemorySaveStore>();
  return std::make_unique<PgSaveStore>(database_url);
}
