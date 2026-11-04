#include "handlers.h"

#include <nlohmann/json.hpp>

#include <chrono>
#include <cmath>

#include "validate.h"

using json = nlohmann::json;

namespace {

void reply(httplib::Response& res, int status, const json& body) {
  res.status = status;
  res.set_content(body.dump(-1, ' ', false, json::error_handler_t::replace), "application/json");
}

void error(httplib::Response& res, int status, const char* code) {
  reply(res, status, json{{"error", code}});
}

int64_t now_ms() {
  return std::chrono::duration_cast<std::chrono::milliseconds>(
             std::chrono::system_clock::now().time_since_epoch())
      .count();
}

json score_json(double s) {
  if (std::floor(s) == s && std::fabs(s) < 9e15) return static_cast<int64_t>(s);
  return s;
}

}  // namespace

void register_routes(httplib::Server& svr, SaveStore& saves, Leaderboard& board) {
  svr.set_payload_max_length(kMaxSaveBytes + 1024);  // JSON envelope slack; exact check in handler

  svr.Get("/api/health", [&](const httplib::Request&, httplib::Response& res) {
    reply(res, 200, json{{"ok", true}, {"db", saves.connected()}, {"redis", board.connected()}});
  });

  svr.Get(R"(/api/save/([^/]*))", [&](const httplib::Request& req, httplib::Response& res) {
    std::string pid = req.matches[1];
    if (!valid_pid(pid)) return error(res, 400, "invalid_pid");
    std::string data;
    int64_t ts = 0;
    if (!saves.get(pid, data, ts)) return error(res, 404, "not_found");
    json d = json::parse(data, nullptr, false);
    if (d.is_discarded()) return error(res, 500, "corrupt_data");
    reply(res, 200, json{{"data", d}, {"updatedAt", ts}});
  });

  svr.Put(R"(/api/save/([^/]*))", [&](const httplib::Request& req, httplib::Response& res) {
    std::string pid = req.matches[1];
    if (!valid_pid(pid)) return error(res, 400, "invalid_pid");
    if (req.body.size() > kMaxSaveBytes) return error(res, 413, "payload_too_large");
    json d = json::parse(req.body, nullptr, false);
    if (d.is_discarded() || !d.is_object()) return error(res, 400, "invalid_json");
    int64_t ts = now_ms();
    saves.put(pid, d.dump(-1, ' ', false, json::error_handler_t::replace), ts);
    reply(res, 200, json{{"ok", true}, {"updatedAt", ts}});
  });

  svr.Post("/api/score", [&](const httplib::Request& req, httplib::Response& res) {
    if (req.body.size() > 4096) return error(res, 413, "payload_too_large");
    json d = json::parse(req.body, nullptr, false);
    if (d.is_discarded() || !d.is_object()) return error(res, 400, "invalid_json");
    auto n = d.find("name");
    auto s = d.find("score");
    if (n == d.end() || !n->is_string() || !valid_name(n->get<std::string>()))
      return error(res, 400, "invalid_name");
    if (s == d.end() || !s->is_number()) return error(res, 400, "invalid_score");
    double score = s->get<double>();
    if (!std::isfinite(score) || score < 0) return error(res, 400, "invalid_score");
    board.submit(n->get<std::string>(), score);
    reply(res, 200, json{{"ok", true}});
  });

  svr.Get("/api/leaderboard", [&](const httplib::Request& req, httplib::Response& res) {
    int limit = 10;
    if (req.has_param("limit") && !parse_limit(req.get_param_value("limit"), limit))
      return error(res, 400, "invalid_limit");
    json arr = json::array();
    for (const auto& e : board.top(limit))
      arr.push_back(json{{"name", e.first}, {"score", score_json(e.second)}});
    reply(res, 200, arr);
  });

  // Unmatched routes and library-generated errors (404, 413, ...) as JSON.
  svr.set_error_handler([](const httplib::Request&, httplib::Response& res) {
    if (!res.body.empty()) return;
    const char* code = res.status == 404   ? "not_found"
                       : res.status == 413 ? "payload_too_large"
                       : res.status == 405 ? "method_not_allowed"
                                           : "error";
    res.set_content(json{{"error", code}}.dump(), "application/json");
  });

  svr.set_exception_handler([](const httplib::Request&, httplib::Response& res, std::exception_ptr) {
    res.status = 500;
    res.set_content(R"({"error":"internal"})", "application/json");
  });
}
