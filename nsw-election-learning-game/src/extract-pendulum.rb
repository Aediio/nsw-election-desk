#!/usr/bin/env ruby

require "json"
require "nokogiri"

unless ARGV.length == 2
  warn "Usage: ruby src/extract-pendulum.rb SOURCE_HTML OUTPUT_JSON"
  exit 1
end

source_path, output_path = ARGV
document = Nokogiri::HTML(File.read(source_path))
records = []

document.css(".td-page-content table tr").each do |row|
  cells = row.css("th,td").map { |cell| cell.text.gsub(/\s+/, " ").strip }
  [[cells[0], cells[1]], [cells[2], cells[3]]].each do |name, margin_text|
    next if name.to_s.empty? || margin_text.to_s.empty? || name == "Seat"

    match = margin_text.match(/\A([A-Z]+)\s+([0-9.]+)%?(?:\s+vs\s+([A-Z]+))?\z/)
    next unless match

    records << {
      "name" => name,
      "holderParty" => match[1],
      "margin" => match[2].to_f,
      "vsParty" => match[3],
      "basis" => match[3] ? "#{match[1]} vs #{match[3]}" : "#{match[1]} vs main opponent",
      "sourceId" => "tallyroom-pendulum",
      "sourceAsOf" => "2026-09-03"
    }
  end
end

records.sort_by! { |record| record["name"] }

unless records.length == 93
  warn "Expected 93 pendulum records, found #{records.length}"
  exit 1
end

File.write(output_path, JSON.pretty_generate(records) + "\n")
puts "Wrote #{records.length} records to #{output_path}"
