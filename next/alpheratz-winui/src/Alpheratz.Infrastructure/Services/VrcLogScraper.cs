using Alpheratz.Domain.Entities;
using Alpheratz.Contracts.Services;
using Alpheratz.Contracts.Infrastructure;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Services;

public class VrcLogScraper : IVrcLogScraper
{
    private readonly RegistryInstallLocationProvider _registry;
    private readonly ILoggingFacade _logger;
    private readonly ConcurrentDictionary<DateTime, (string Id, string Name)> _cache = new();

    public VrcLogScraper(RegistryInstallLocationProvider registry, ILoggingFacade logger)
    {
        _registry = registry;
        _logger = logger;
    }

    /// <summary>
    /// Implementation of IVrcLogScraper.
    /// Scrapes recent log files for join/world entry events.
    /// </summary>
    public async Task<List<WorldVisit>> ScrapeLatestEventsAsync()
    {
        var logsDir = _registry.GetVrcLogsDirectory();
        if (!Directory.Exists(logsDir)) return new List<WorldVisit>();

        var results = new List<WorldVisit>();
        try
        {
            var logFiles = Directory.EnumerateFiles(logsDir, "output_log_*.txt")
                .Select(f => new FileInfo(f))
                .OrderByDescending(f => f.LastWriteTime)
                .Take(5);

            foreach (var logFile in logFiles)
            {
                using var stream = new FileStream(logFile.FullName, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                using var reader = new StreamReader(stream);
                
                string? line;
                while ((line = await reader.ReadLineAsync()) != null)
                {
                    var match = JoiningRegex.Match(line);
                    if (match.Success)
                    {
                        var timeStr = line.Substring(0, 19);
                        if (DateTime.TryParseExact(timeStr, "yyyy.MM.dd HH:mm:ss", null, System.Globalization.DateTimeStyles.None, out var logTime))
                        {
                            results.Add(new WorldVisit(logTime, match.Groups[1].Value, match.Groups[2].Value.Trim()));
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.Warn("VrcLogScraper", "LogEvent", $"Log scraping failed: {ex.Message}");
        }

        return results;
    }

    private static readonly Regex JoiningRegex = new Regex(@"\[RoomManager\] Joining (wrld_[a-f0-9\-]+):(.*)", RegexOptions.Compiled);

    public async Task<(string Id, string Name)?> FindWorldAtTimeAsync(DateTime timestamp)
    {
        // Check cache first (ignore seconds for better match in same world session)
        var sessionTime = new DateTime(timestamp.Year, timestamp.Month, timestamp.Day, timestamp.Hour, timestamp.Minute, 0);
        if (_cache.TryGetValue(sessionTime, out var cached)) return cached;

        var logsDir = _registry.GetVrcLogsDirectory();
        if (!Directory.Exists(logsDir)) return null;

        try
        {
            var logFiles = Directory.EnumerateFiles(logsDir, "output_log_*.txt")
                .Select(f => new FileInfo(f))
                .OrderByDescending(f => f.LastWriteTime)
                .Take(3);

            foreach (var logFile in logFiles)
            {
                using var stream = new FileStream(logFile.FullName, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                using var reader = new StreamReader(stream);
                
                var buffer = new List<string>();
                string? line;
                while ((line = await reader.ReadLineAsync()) != null)
                {
                    buffer.Add(line);
                    if (buffer.Count > 1000) buffer.RemoveAt(0);
                }

                for (int i = buffer.Count - 1; i >= 0; i--)
                {
                    var currentLine = buffer[i];
                    var match = JoiningRegex.Match(currentLine);
                    if (match.Success)
                    {
                        var timeStr = currentLine.Substring(0, 19);
                        if (DateTime.TryParseExact(timeStr, "yyyy.MM.dd HH:mm:ss", null, System.Globalization.DateTimeStyles.None, out var logTime))
                        {
                            if (logTime <= timestamp)
                            {
                                var result = (match.Groups[1].Value, match.Groups[2].Value.Trim());
                                _cache[sessionTime] = result;
                                return result;
                            }
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.Warn("VrcLogScraper", "LogEvent", $"Log scraping failed: {ex.Message}");
        }

        return null;
    }
}
