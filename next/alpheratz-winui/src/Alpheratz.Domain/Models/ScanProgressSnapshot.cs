namespace Alpheratz.Domain.Models;

/// <summary>
/// Represents a point-in-time snapshot of the photo scanning progress.
/// </summary>
public class ScanProgressSnapshot
{
    /// <summary>
    /// The total number of files discovered.
    /// </summary>
    public int TotalCount { get; }

    /// <summary>
    /// The number of files already processed.
    /// </summary>
    public int ProcessedCount { get; }

    /// <summary>
    /// The name of the file currently being processed.
    /// </summary>
    public string CurrentFile { get; }

    /// <summary>
    /// Gets the percentage completion (0-100).
    /// </summary>
    public float Percentage => TotalCount == 0 ? 0 : (float)ProcessedCount / TotalCount * 100;

    public ScanProgressSnapshot(int totalCount, int processedCount, string currentFile)
    {
        TotalCount = totalCount;
        ProcessedCount = processedCount;
        CurrentFile = currentFile;
    }
}
