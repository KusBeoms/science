#pragma once
#include <cstddef>
#include <string>

constexpr size_t kMaxSaveBytes = 256 * 1024;

bool valid_pid(const std::string& pid);            // ^[A-Za-z0-9_-]{8,64}$
bool valid_name(const std::string& name);          // 1..20 UTF-8 code points, no control chars
bool parse_limit(const std::string& s, int& out);  // 1..100

constexpr size_t kMaxJsonDepth = 32;
constexpr double kMaxScore = 1e12;

// True if the JSON text nests arrays/objects no deeper than max_depth. Scans the raw text
// (string/escape aware) so it runs BEFORE parsing: deeply nested input can exhaust the stack
// in recursive parse/dump/destructor code.
bool json_depth_ok(const std::string& text, size_t max_depth = kMaxJsonDepth);
// True if serialized JSON contains a real \u0000 escape. PostgreSQL JSONB rejects it.
bool has_nul_escape(const std::string& serialized);

