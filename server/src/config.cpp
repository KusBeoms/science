#include "config.h"

#include <cstdlib>

static std::string env(const char* k) {
  const char* v = std::getenv(k);
  return v ? std::string(v) : std::string();
}

Config load_config() {
  Config c;
  c.database_url = env("DATABASE_URL");
  c.redis_url = env("REDIS_URL");
  c.static_dir = env("STATIC_DIR");
  std::string p = env("PORT");
  if (!p.empty()) {
    int n = std::atoi(p.c_str());
    if (n > 0 && n < 65536) c.port = n;
  }
  return c;
}
