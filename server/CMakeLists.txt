cmake_minimum_required(VERSION 3.16)
project(science26_api CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

find_package(Threads REQUIRED)
find_package(nlohmann_json 3.2 REQUIRED)
find_package(PostgreSQL REQUIRED)
find_package(PkgConfig REQUIRED)
pkg_check_modules(HIREDIS REQUIRED hiredis)

# cpp-httplib: Debian's libcpp-httplib-dev ships a compiled library + header.
find_path(HTTPLIB_INCLUDE_DIR httplib.h REQUIRED)
find_library(HTTPLIB_LIBRARY cpp-httplib REQUIRED)

add_executable(api
  src/main.cpp src/config.cpp src/validate.cpp src/handlers.cpp
  src/store_memory.cpp src/store_pg.cpp src/leaderboard_redis.cpp)
target_include_directories(api PRIVATE ${HTTPLIB_INCLUDE_DIR} ${HIREDIS_INCLUDE_DIRS})
target_link_libraries(api PRIVATE Threads::Threads nlohmann_json::nlohmann_json
  PostgreSQL::PostgreSQL ${HIREDIS_LIBRARIES} ${HTTPLIB_LIBRARY})
target_compile_options(api PRIVATE -Wall -Wextra)
