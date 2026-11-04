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
