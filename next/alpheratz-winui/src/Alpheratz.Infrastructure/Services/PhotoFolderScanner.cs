using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Services;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.Entities;
using Alpheratz.Domain.Models;
using Alpheratz.Domain.ValueObjects;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Services;

/// <summary>
/// Orchestrates high-performance file discovery, metadata extraction, and perceptual hashing.
/// Follows Design Doc Section 8.5 / 1386.
/// </summary>
public class PhotoFolderScanner
{
    private readonly PhotoFileEnumerator _enumerator;
    private readonly PhotoMetadataAnalyzer _analyzer;
    private readonly IPhotoMutationRepository _photoMutation;
    private readonly IPhotoReadRepository _photoRead;
    private readonly ILoggingFacade _logger;

    public PhotoFolderScanner(
        PhotoFileEnumerator enumerator,
        PhotoMetadataAnalyzer analyzer,
        IPhotoMutationRepository photoMutation,
        IPhotoReadRepository photoRead,
        ILoggingFacade logger)
    {
        _enumerator = enumerator;
        _analyzer = analyzer;
        _photoMutation = photoMutation;
        _photoRead = photoRead;
        _logger = logger;
    }

    /// <summary>
    /// Scans a directory for supported photos and synchronizes them with the database.
    /// Uses concurrent processing for CPU-intensive hashing.
    /// </summary>
    public async Task ScanAsync(int sourceSlot, string rootPath, IProgress<ScanProgressSnapshot>? progress, CancellationToken ct)
    {
        if (!Directory.Exists(rootPath))
        {
            _logger.Warn("Scanner", "Scan", $"Directory does not exist: {rootPath}");
            return;
        }

        _logger.Info("Scanner", "Scan", $"Starting concurrent scan for slot {sourceSlot} at {rootPath}");

        // 1. Enumerate files
        var files = _enumerator.EnumeratePhotos(rootPath).ToList();
        int total = files.Count;
        int processed = 0;
        var slot = SourceSlot.FromInt(sourceSlot);
        
        if (total == 0)
        {
            _logger.Info("Scanner", "Scan", "No photo files found.");
            return;
        }

        // 2. Process files in parallel
        var batch = new ConcurrentQueue<Photo>();
        var options = new ParallelOptions 
        { 
            MaxDegreeOfParallelism = Math.Max(1, Environment.ProcessorCount - 1),
            CancellationToken = ct 
        };

        await Parallel.ForEachAsync(files, options, async (file, token) =>
        {
            try
            {
                var identity = new PhotoIdentity(file);
                
                // Optimized scan: skip if already in DB
                // In production, we should probably check file size/date to handle modifications
                var existing = await _photoRead.GetPhotoDetailAsync(identity);
                if (existing == null)
                {
                    var photo = await _analyzer.AnalyzeAsync(file, slot);
                    batch.Enqueue(photo);

                    // Batch flush to DB to reduce transaction overhead
                    if (batch.Count >= 50)
                    {
                        await FlushBatchAsync(batch);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.Error("Scanner", "ProcessFile", $"Failed to process file {file}.", ex);
            }

            var currentProcessed = Interlocked.Increment(ref processed);
            if (currentProcessed % 5 == 0 || currentProcessed == total)
            {
                progress?.Report(new ScanProgressSnapshot(total, currentProcessed, Path.GetFileName(file)));
            }
        });

        // Final flush
        await FlushBatchAsync(batch);
        _logger.Info("Scanner", "Scan", $"Scan completed for slot {sourceSlot}. Processed {processed}/{total} files.");
    }

    private async Task FlushBatchAsync(ConcurrentQueue<Photo> queue)
    {
        var photos = new List<Photo>();
        while (photos.Count < 100 && queue.TryDequeue(out var photo))
        {
            photos.Add(photo);
        }

        if (photos.Any())
        {
            try
            {
                await _photoMutation.BulkUpsertPhotosAsync(photos);
            }
            catch (Exception ex)
            {
                _logger.Error("Scanner", "Flush", "Failed to flush photo batch to database.", ex);
            }
        }
    }
}
