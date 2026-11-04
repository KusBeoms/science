#include "validate.h"

#include <cctype>
#include <cstdlib>

bool valid_pid(const std::string& pid) {
  if (pid.size() < 8 || pid.size() > 64) return false;
  for (unsigned char c : pid) {
    if (!(std::isalnum(c) && c < 128) && c != '_' && c != '-') return false;
  }
  return true;
}

bool valid_name(const std::string& name) {
  size_t cps = 0;
  for (unsigned char c : name) {
    if (c < 0x20 || c == 0x7f) return false;
    if ((c & 0xC0) != 0x80) ++cps;  // count non-continuation bytes
  }
  return cps >= 1 && cps <= 20;
}

bool parse_limit(const std::string& s, int& out) {
  if (s.empty() || s.size() > 3) return false;
  for (unsigned char c : s) {
    if (!std::isdigit(c)) return false;
  }
  int n = std::atoi(s.c_str());
  if (n < 1 || n > 100) return false;
  out = n;
  return true;
}

bool json_depth_ok(const std::string& text, size_t max_depth) {
  size_t depth = 0;
  bool in_str = false, esc = false;
  for (char c : text) {
    if (in_str) {
      if (esc) esc = false;
      else if (c == '\\') esc = true;
      else if (c == '"') in_str = false;
      continue;
    }
    if (c == '"') in_str = true;
    else if (c == '[' || c == '{') {
      if (++depth > max_depth) return false;
    } else if (c == ']' || c == '}') {
      if (depth > 0) --depth;
    }
  }
  return true;
}

bool has_nul_escape(const std::string& s) {
  static const std::string kNul = "\\u0000";
  for (size_t pos = s.find(kNul); pos != std::string::npos; pos = s.find(kNul, pos + 1)) {
    size_t bs = 0;  // backslashes immediately before this one: even -> this backslash starts an escape
    while (bs < pos && s[pos - 1 - bs] == '\\') ++bs;
    if (bs % 2 == 0) return true;
  }
  return false;
}
