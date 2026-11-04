#pragma once
#include <cstddef>
#include <string>

constexpr size_t kMaxSaveBytes = 256 * 1024;

bool valid_pid(const std::string& pid);            // ^[A-Za-z0-9_-]{8,64}$
bool valid_name(const std::string& name);          // 1..20 UTF-8 code points, no control chars
bool parse_limit(const std::string& s, int& out);  // 1..100
