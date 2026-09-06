#!/usr/bin/env ruby

require "json"
require "set"
require "time"
require "base64"
require "digest"
require "fileutils"

ROOT = File.expand_path("..", __dir__)
DATA_DIR = File.join(ROOT, "data")
abort "Source validation failed" unless system(RbConfig.ruby, File.join(__dir__, "validate.rb"), "--source-only")

def read_json(path)
  JSON.parse(File.read(path))
end

def canonical_name(value)
  value.to_s.gsub(/\s*\*\s*\z/, "").strip
end

def party_code(name)
  {
    "Australian Labor Party" => "ALP",
    "Liberal Party" => "LIB",
    "The Nationals" => "NAT",
    "The Greens" => "GRN",
    "Independent" => "IND",
    "Shooters, Fishers and Farmers Party" => "SFF",
    "Legalise Cannabis Party" => "LCNSW",
    "Animal Justice Party" => "AJP",
    "Libertarian Party" => "LDP",
    "Pauline Hanson's One Nation" => "ON"
  }.fetch(name, name)
end

def geometry_rings(geometry)
  case geometry.fetch("type")
  when "Polygon"
    geometry.fetch("coordinates")
  when "MultiPolygon"
    geometry.fetch("coordinates").flatten(1)
  else
    []
  end
end

def segment_keys(geometry)
  geometry_rings(geometry).each_with_object(Set.new) do |ring, keys|
    ring.each_cons(2) do |left, right|
      a = left.map { |number| number.round(5) }.join(",")
      b = right.map { |number| number.round(5) }.join(",")
      keys << [a, b].sort.join("|") unless a == b
    end
  end
end

def d3_geometry(geometry)
  # Spatial Services exports RFC 7946 winding (outer rings counter-clockwise),
  # while d3-geo's spherical polygon convention expects the reverse. Rewind
  # every ring in the compiled copy so districts render as NSW shapes rather
  # than the complement of each polygon. The authoritative source file stays
  # untouched in data/.
  coordinates = case geometry.fetch("type")
  when "Polygon"
    geometry.fetch("coordinates").map(&:reverse)
  when "MultiPolygon"
    geometry.fetch("coordinates").map { |polygon| polygon.map(&:reverse) }
  else
    geometry.fetch("coordinates")
  end
  { "type" => geometry.fetch("type"), "coordinates" => coordinates }
end

def fail_mismatch(label, expected, actual)
  missing = expected - actual
  extra = actual - expected
  return if missing.empty? && extra.empty?

  warn "#{label} mismatch. Missing: #{missing.inspect}; extra: #{extra.inspect}"
  exit 1
end

results = read_json(File.join(DATA_DIR, "seat-results-2023.json"))
members_la = read_json(File.join(DATA_DIR, "current-la-members.json"))
members_lc = read_json(File.join(DATA_DIR, "current-lc-members.json"))
pendulum = read_json(File.join(DATA_DIR, "current-pendulum.json"))
geojson = read_json(File.join(DATA_DIR, "state-electoral-districts.geojson"))
regions = read_json(File.join(ROOT, "src", "regions.json"))
content = read_json(File.join(ROOT, "src", "editorial-content.json"))
static_cards = content.fetch("facts").map { |fact| fact.reject { |key, _| ["statement", "learning"].include?(key) }.merge(fact.fetch("learning")).merge("answer" => fact.fetch("statement")) }

results.each { |record| record["name"] = canonical_name(record["name"]) }
canonical_seats = results.map { |record| record["name"] }.sort

region_by_seat = {}
regions.each do |region, names|
  names.each do |name|
    if region_by_seat.key?(name)
      warn "Seat #{name} occurs in more than one reporting region"
      exit 1
    end
    region_by_seat[name] = region
  end
end

member_by_seat = members_la.to_h { |member| [canonical_name(member["electorate"]), member] }
pendulum_by_seat = pendulum.to_h { |record| [canonical_name(record["name"]), record] }
feature_by_seat = geojson.fetch("features").to_h do |feature|
  name = canonical_seats.find { |seat| seat.upcase == feature.dig("properties", "districtname").to_s.upcase }
  [name, feature]
end

fail_mismatch("Reporting regions", canonical_seats, region_by_seat.keys.sort)
fail_mismatch("Current Assembly members", canonical_seats, member_by_seat.keys.sort)
fail_mismatch("Current analyst pendulum", canonical_seats, pendulum_by_seat.keys.sort)
fail_mismatch("Boundary geometry", canonical_seats, feature_by_seat.keys.compact.sort)

segments_by_seat = feature_by_seat.transform_values { |feature| segment_keys(feature.fetch("geometry")) }
neighbours = canonical_seats.to_h { |name| [name, []] }
canonical_seats.combination(2) do |left, right|
  next if (segments_by_seat.fetch(left) & segments_by_seat.fetch(right)).empty?

  neighbours[left] << right
  neighbours[right] << left
end

seats = results.sort_by { |record| record["name"] }.map do |result|
  name = result.fetch("name")
  member = member_by_seat.fetch(name)
  current = pendulum_by_seat.fetch(name)
  current_party = party_code(member.fetch("party"))
  official_party = result.dig("winner2023", "party")
  margin = current.fetch("margin")
  non_classic = current["vsParty"] && !["ALP", "LIB", "NAT"].include?(current["vsParty"])
  changed_since_2023 = current_party != official_party
  unless current.fetch("holderParty") == current_party
    warn "Current holder mismatch for #{name}: Parliament says #{current_party}, pendulum says #{current['holderParty']}"
    exit 1
  end
  tier = if margin <= 4.0
    1
  elsif margin <= 8.0 || non_classic || changed_since_2023 || ["IND", "GRN"].include?(current_party)
    2
  end

  reasons = []
  reasons << "Analyst margin is #{format('%.1f', margin)} points" if margin <= 8.0
  reasons << "Non-classic #{current['basis']} contest" if current["vsParty"]
  reasons << "Current holder differs from the 2023 winning party" if changed_since_2023
  reasons << "Crossbench-held seat" if ["IND", "GRN"].include?(current_party)

  {
    "name" => name,
    "slug" => result.fetch("slug"),
    "region" => region_by_seat.fetch(name),
    "urbanity" => feature_by_seat.fetch(name).dig("properties", "urbanity"),
    "currentMember" => member.fetch("name"),
    "currentParty" => current_party,
    "currentPartyName" => member.fetch("party"),
    "ministry" => member.fetch("ministry", []),
    "office" => member.fetch("office", []),
    "winner2023" => result.fetch("winner2023"),
    "opponent2023" => result.fetch("opponent2023"),
    "margin2023" => result.fetch("margin2023"),
    "primary2023" => result.fetch("primary2023"),
    "enrolled2023" => result.fetch("enrolled2023"),
    "turnout2023" => result.fetch("turnout2023"),
    "informal2023" => result.fetch("informal2023"),
    "candidates2023" => result.fetch("candidates2023"),
    "currentMargin" => margin,
    "currentMarginBasis" => current.fetch("basis"),
    "currentMarginSourceAsOf" => current.fetch("sourceAsOf"),
    "changedSince2023" => changed_since_2023,
    "watchTier" => tier,
    "watchReasons" => reasons,
    "neighbours" => neighbours.fetch(name).sort
  }
end

clean_features = canonical_seats.map do |name|
  feature = feature_by_seat.fetch(name)
  {
    "type" => "Feature",
    "properties" => {
      "name" => name,
      "urbanity" => feature.dig("properties", "urbanity")
    },
    "geometry" => d3_geometry(feature.fetch("geometry"))
  }
end

members_la.each do |member|
  member["electorate"] = canonical_name(member["electorate"])
  member["partyCode"] = party_code(member["party"])
end
members_lc.each { |member| member["partyCode"] = party_code(member["party"]) }

composition_la = members_la.group_by { |member| member["partyCode"] }.transform_values(&:length)
composition_lc = members_lc.group_by { |member| member["partyCode"] }.transform_values(&:length)

payload = {
  "meta" => content.fetch("meta").merge(
    "builtAt" => ENV.fetch("SOURCE_DATE_EPOCH", "0").to_i.then { |epoch| epoch.zero? ? content.dig("meta", "contentAsOf") : Time.at(epoch).utc.iso8601 },
    "contentVersion" => Digest::SHA256.hexdigest(Dir.glob(File.join(DATA_DIR, "*")).sort.map { |path| File.read(path) }.join + JSON.generate(content))[0, 12],
    "seatCount" => seats.length,
    "memberCountLA" => members_la.length,
    "memberCountLC" => members_lc.length,
    "boundarySource" => "Spatial Services NSW",
    "resultSource" => "NSW Electoral Commission",
    "currentMemberSource" => "Parliament of NSW",
    "pendulumSource" => "The Tally Room (analyst snapshot; not a forecast)"
  ),
  "manifest" => read_json(File.join(DATA_DIR, "manifest.json")),
  "sources" => content.fetch("sources"),
  "seats" => seats,
  "membersLA" => members_la.sort_by { |member| member["name"] },
  "membersLC" => members_lc.sort_by { |member| member["name"] },
  "compositionLA" => composition_la,
  "compositionLC" => composition_lc,
  "regions" => regions.keys,
  "boundaries" => {
    "type" => "FeatureCollection",
    "features" => clean_features
  },
  "staticCards" => static_cards,
  "campaignLedger" => content.fetch("campaignLedger"),
  "interstateLens" => content.fetch("interstateLens"),
  "reportingDomains" => content.fetch("reportingDomains"),
  "newsroomScenarios" => content.fetch("newsroomScenarios")
}

template = File.read(File.join(ROOT, "src", "app.template.html"))
d3 = File.read(File.join(ROOT, "vendor", "d3.v7.9.0.min.js"))
json = JSON.generate(payload).gsub("</", "<\\/")

unless template.include?("__D3_LIBRARY_BASE64__") && template.include?("/*__GAME_DATA__*/")
  warn "Template placeholders are missing"
  exit 1
end

html = template.sub("__D3_LIBRARY_BASE64__", Base64.strict_encode64(d3)).sub("/*__GAME_DATA__*/", "window.NSW_GAME_DATA=#{json};")
{"/*__STYLES__*/" => "styles.css", "/*__LEARNING__*/" => "learning.js", "/*__GEMINI__*/" => "gemini.js", "/*__APP__*/" => "app.js"}.each do |placeholder, file|
  html = html.sub(placeholder) { File.read(File.join(ROOT, "src", file)).gsub("</script", "<\\/script") }
end
output_path = File.join(ROOT, "index.html")
File.write(output_path, html)

puts "Built #{output_path}"
puts "Seats: #{seats.length}; LA: #{members_la.length}; LC: #{members_lc.length}; cards: #{static_cards.length}"
puts "Boundary neighbours detected: #{neighbours.values.sum(&:length) / 2} shared borders"

# Cacheable Pages bundle; portable index remains self-contained.
dist = File.join(ROOT, "..", "dist")
FileUtils.mkdir_p(dist)
web = template.sub(/<script src="data:text\/javascript;base64,__D3_LIBRARY_BASE64__"><\/script>/, '<script src="./d3.js"></script>').sub('<script>/*__GAME_DATA__*/</script>', '<script src="./data.js"></script>')
{"styles.css" => "STYLES", "learning.js" => "LEARNING", "gemini.js" => "GEMINI", "app.js" => "APP"}.each do |file, token|
  tag = file.end_with?("css") ? "<style>/*__#{token}__*/</style>" : "<script>/*__#{token}__*/</script>"
  replacement = file.end_with?("css") ? '<link rel="stylesheet" href="./styles.css">' : '<script src="./' + file + '"></script>'
  web = web.sub(tag, replacement)
  FileUtils.cp(File.join(ROOT, "src", file), File.join(dist, file))
end
File.write(File.join(dist, "index.html"), web)
File.write(File.join(dist, "data.js"), "window.NSW_GAME_DATA=#{json};")
File.write(File.join(dist, "d3.js"), d3)
icon = '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="100" fill="#142b3f"/><path d="M120 128h272v256H120z" fill="#f3f4ef"/><path d="M154 170h204v32H154zm0 60h90v110h-90zm116 0h88v18h-88zm0 42h88v18h-88zm0 42h88v18h-88z" fill="#cc5b32"/></svg>'
manifest = {name: "NSW Election Desk", short_name: "Election Desk", start_url: "./", scope: "./", display: "standalone", background_color: "#142b3f", theme_color: "#142b3f", icons: [{src: "./icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any"}]}
[ROOT,dist].each { |dir| File.write(File.join(dir,"manifest.webmanifest"),JSON.pretty_generate(manifest)); File.write(File.join(dir,"icon.svg"),icon) }
[ROOT,dist].each do |dir|
  assets = dir == ROOT ? ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"] : ["./", "./index.html", "./styles.css", "./learning.js", "./gemini.js", "./app.js", "./data.js", "./d3.js", "./manifest.webmanifest", "./icon.svg"]
  digest = Digest::SHA256.hexdigest(assets.reject { |f| f == "./" }.map { |file| File.read(File.join(dir,file)) }.join)[0,16]
  worker = <<~JS
    const CACHE='nsw-desk-#{digest}', ASSETS=#{JSON.generate(assets)};
    self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
    self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('nsw-desk-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
    self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;event.respondWith(caches.open(CACHE).then(cache=>cache.match(event.request).then(hit=>hit||fetch(event.request))));});
  JS
  File.write(File.join(dir,"sw.js"),worker)
end
File.write(File.join(dist,".nojekyll"),"")
puts "Pages bundle: #{dist}"
