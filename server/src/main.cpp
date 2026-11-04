#include <httplib.h>

#include <csignal>
#include <cstdio>

#include "config.h"
#include "handlers.h"
#include "store.h"

static httplib::Server* g_server = nullptr;
static void on_signal(int) {
  if (g_server) g_server->stop();
}

int main() {
  Config cfg = load_config();
  auto saves = make_save_store(cfg.database_url);
  auto board = make_leaderboard(cfg.redis_url);
  std::fprintf(stderr, "db=%s redis=%s\n", saves->connected() ? "pg" : "memory",
               board->connected() ? "redis" : "memory");

  httplib::Server svr;
  g_server = &svr;
  std::signal(SIGINT, on_signal);
  std::signal(SIGTERM, on_signal);
  register_routes(svr, *saves, *board);
  if (!cfg.static_dir.empty() && !svr.set_mount_point("/", cfg.static_dir))
    std::fprintf(stderr, "STATIC_DIR not found: %s\n", cfg.static_dir.c_str());

  std::fprintf(stderr, "listening on :%d\n", cfg.port);
  if (!svr.listen("0.0.0.0", cfg.port)) {
    std::fprintf(stderr, "listen failed\n");
    return 1;
  }
  return 0;
}
