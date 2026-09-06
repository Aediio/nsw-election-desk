#!/usr/bin/env ruby

require "json"

root = File.expand_path("..", __dir__)
data_dir = File.join(root, "data")

def read_json(path)
  JSON.parse(File.read(path))
rescue JSON::ParserError => error
  abort "Invalid JSON in #{path}: #{error.message}"
end

def assert(condition, message)
  abort "Validation failed: #{message}" unless condition
end

la = read_json(File.join(data_dir, "current-la-members.json"))
lc = read_json(File.join(data_dir, "current-lc-members.json"))
results = read_json(File.join(data_dir, "seat-results-2023.json"))
pendulum = read_json(File.join(data_dir, "current-pendulum.json"))
boundaries = read_json(File.join(data_dir, "state-electoral-districts.geojson"))
manifest = read_json(File.join(data_dir, "manifest.json"))
regions = read_json(File.join(root, "src", "regions.json"))
content = read_json(File.join(root, "src", "editorial-content.json"))
static_cards = content.fetch("facts").map { |fact| fact.reject { |key, _| ["statement", "learning"].include?(key) }.merge(fact.fetch("learning")).merge("answer" => fact.fetch("statement")) }

seat_names = results.map { |record| record.fetch("name").sub(/\s*\*\s*\z/, "") }
region_names = regions.values.flatten
boundary_names = boundaries.fetch("features").map { |feature| feature.dig("properties", "districtname") }
source_ids = content.fetch("sources").map { |source| source.fetch("id") }
card_ids = static_cards.map { |card| card.fetch("id") }

assert(la.length == 93, "expected 93 Legislative Assembly members, found #{la.length}")
assert(lc.length == 42, "expected 42 Legislative Council members, found #{lc.length}")
assert(results.length == 93, "expected 93 official 2023 results, found #{results.length}")
assert(pendulum.length == 93, "expected 93 current pendulum records, found #{pendulum.length}")
assert(boundaries.fetch("features").length == 93, "expected 93 boundary features")
assert(seat_names.uniq.length == 93, "official seat names are not unique")
assert(region_names.uniq.length == 93, "region mapping must contain every seat exactly once")
assert(seat_names.sort == region_names.sort, "region names do not exactly match official seat names")
assert(seat_names.map(&:upcase).sort == boundary_names.sort, "boundary district names do not match result names")
assert(la.map { |member| member.fetch("electorate") }.sort == seat_names.sort, "Assembly member electorates do not match result names")
assert(pendulum.map { |record| record.fetch("name") }.sort == seat_names.sort, "pendulum names do not match result names")
assert(source_ids.uniq.length == source_ids.length, "source IDs are not unique")
assert(card_ids.uniq.length == card_ids.length, "authored card IDs are not unique")
assert(la.map { |member| member.fetch("memberId") }.uniq.length == 93, "Assembly member IDs are not unique")
assert(lc.map { |member| member.fetch("memberId") }.uniq.length == 42, "Council member IDs are not unique")
assert(content.fetch("sources").all? { |source| source.fetch("url").start_with?("https://") }, "all source URLs must use HTTPS")
assert(content.dig("meta", "contentAsOf") =~ /\A\d{4}-\d{2}-\d{2}\z/, "contentAsOf must be an ISO date")
assert(content.dig("meta", "electionDate") =~ /\A\d{4}-\d{2}-\d{2}\z/, "electionDate must be an ISO date")
assert(manifest.fetch("contentAsOf") == content.dig("meta", "contentAsOf"), "manifest and editorial content dates differ")
assert(manifest.fetch("datasets").map { |item| item.fetch("file") }.sort == ["current-la-members.json", "current-lc-members.json", "current-pendulum.json", "seat-results-2023.json", "state-electoral-districts.geojson"], "manifest dataset list is incomplete")

static_cards.each do |card|
  assert(!card.fetch("prompt").empty?, "card #{card['id']} has no prompt")
  assert(!card.fetch("answer").empty?, "card #{card['id']} has no answer")
  unknown = card.fetch("sourceIds", []) - source_ids
  assert(unknown.empty?, "card #{card['id']} cites unknown sources #{unknown.inspect}")
end

["campaignLedger", "interstateLens"].each do |collection|
  content.fetch(collection).each do |item|
    unknown = item.fetch("sourceIds", []) - source_ids
    assert(unknown.empty?, "#{collection} item #{item['id']} cites unknown sources #{unknown.inspect}")
  end
end

campaign_ids = content.fetch("campaignLedger").map { |item| item.fetch("id") }
assert(campaign_ids.uniq.length == campaign_ids.length, "campaign ledger IDs are not unique")
assert(content.fetch("campaignLedger").all? { |item| item.fetch("date") <= content.dig("meta", "contentAsOf") }, "campaign ledger contains a future-dated item")

results.each do |seat|
  assert(seat.fetch("margin2023").between?(0, 50), "implausible 2023 margin for #{seat['name']}")
  assert(seat.fetch("turnout2023").between?(50, 100), "implausible turnout for #{seat['name']}")
  assert(seat.fetch("informal2023").between?(0, 20), "implausible informality for #{seat['name']}")
  assert(seat.fetch("candidates2023").length >= 2, "too few 2023 candidates for #{seat['name']}")
end

pendulum.each do |seat|
  assert(seat.fetch("margin").between?(0, 50), "implausible current margin for #{seat['name']}")
end

# Validate records before generating output, including data that previously bypassed joins.
require "date"
manifest.fetch("datasets").each do |dataset|
  path = File.join(data_dir, dataset.fetch("file"))
  assert(File.file?(path), "missing dataset #{dataset['file']}")
  %w[description source authority retrieved refresh].each { |key| assert(!dataset[key].to_s.empty?, "#{dataset['file']} lacks #{key}") }
  begin
    date = Date.iso8601(dataset.fetch("retrieved"))
    assert(date <= Date.today, "future retrieval date for #{dataset['file']}")
    warn "Stale dataset: #{dataset['file']} (#{date})" if Date.today - date > dataset.fetch("maxAgeDays", 36500)
  rescue Date::Error
    assert(false, "invalid retrieval date for #{dataset['file']}")
  end
end
assert((la + lc).map { |m| m.fetch("memberId") }.uniq.length == 135, "member IDs collide across houses")
[[la, "Legislative Assembly"], [lc, "Legislative Council"]].each do |members, house|
  members.each do |member|
    %w[memberId name party].each { |key| assert(member[key].is_a?(String) && !member[key].strip.empty?, "invalid member #{key}") }
    assert(member["house"] == house, "incorrect member house")
    %w[ministry office].each { |key| assert(member[key].is_a?(Array) && member[key].all? { |r| r.is_a?(String) && !r.empty? }, "invalid roles for #{member['name']}") }
    assert(!member["validFrom"] || !member["validTo"] || member["validFrom"] <= member["validTo"], "impossible role validity")
  end
end
results.each do |seat|
  assert((seat.dig("winner2023", "finalPct") + seat.dig("opponent2023", "finalPct") - 100).abs <= 0.03, "final pair does not sum to 100 for #{seat['name']}")
  assert((seat.dig("winner2023", "finalPct") - 50 - seat.fetch("margin2023")).abs <= 0.03, "TCP margin mismatch #{seat['name']}")
  assert(seat["enrolled2023"].is_a?(Numeric) && seat["enrolled2023"] > 0, "invalid enrolment")
  assert(seat.keys.none? { |key| key.start_with?("current") }, "current data mixed into historical results")
  seat.fetch("candidates2023").each { |c| assert(c["primaryPct"].between?(0,100) && c["votes"] >= 0, "invalid candidate result") }
end
pendulum.each do |seat|
  assert(seat["sourceId"] == "tallyroom-pendulum" && seat["sourceAsOf"].to_s.match?(/\A\d{4}-\d{2}-\d{2}\z/), "analyst margin lacks provenance")
  assert(!seat["basis"].to_s.empty?, "margin lacks contest basis")
end
boundaries.fetch("features").each do |feature|
  geometry = feature.fetch("geometry")
  assert(%w[Polygon MultiPolygon].include?(geometry["type"]), "invalid boundary geometry")
  rings = geometry["type"] == "Polygon" ? geometry["coordinates"] : geometry["coordinates"].flatten(1)
  rings.each do |ring|
    assert(ring.length >= 4 && ring.first == ring.last, "unclosed boundary ring")
    ring.each { |xy| assert(xy[0].between?(140,160) && xy[1].between?(-38,-27), "geometry is not NSW WGS84") }
  end
end
static_cards.each do |card|
  assert(card.fetch("sourceIds", []).any? || card["verificationStatus"] == "inference", "unsourced factual card #{card['id']}")
  assert(!card["distractors"] || (!card["distractors"].include?(card["answer"]) && card["distractors"].uniq.length == card["distractors"].length), "duplicate/correct distractor")
end

puts "Source validation passed"
exit 0 if ARGV.include?("--source-only")

html_path = File.join(root, "index.html")
assert(File.exist?(html_path), "index.html has not been built")
html = File.read(html_path)
assert(html.start_with?("<!doctype html>"), "index.html is not a full HTML document")
assert(!html.include?("__D3_LIBRARY_BASE64__"), "D3 placeholder remains in index.html")
assert(!html.include?("/*__GAME_DATA__*/"), "data placeholder remains in index.html")
assert(html.include?("window.NSW_GAME_DATA="), "compiled game data is missing")
assert(File.size(html_path) < 1_500_000, "standalone HTML exceeds 1.5 MB")

puts "Validation passed"
puts "93 seats · 93 Assembly members · 42 Council members · #{static_cards.length} authored core cards"
puts "#{content.fetch('campaignLedger').length} campaign entries · #{content.fetch('newsroomScenarios').length} newsroom scenarios"
puts "Standalone HTML: #{File.size(html_path)} bytes"
