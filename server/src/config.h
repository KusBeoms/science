#pragma once
#include <string>

struct Config {
  int port = 8080;
  std::string database_url;  // empty -> in-memory saves
  std::string redis_url;     // empty -> in-memory leaderboard
  std::string static_dir;    // empty -> no static serving
};

Config load_config();
