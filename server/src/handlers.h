#pragma once
#include <httplib.h>

#include "store.h"

// Registers /api/* routes plus JSON 404/413 handling.
void register_routes(httplib::Server& svr, SaveStore& saves, Leaderboard& board);
