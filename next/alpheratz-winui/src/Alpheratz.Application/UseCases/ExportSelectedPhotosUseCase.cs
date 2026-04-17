using Alpheratz.Contracts.Services;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.ValueObjects;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

/// <summary>
/// Domain-centric service for exporting selected photos to a user-specified directory.
/// Follows Design Doc Section 8.3 / 1082.
/// </summary>
public class ExportSelectedPhotosUseCase
{
    private readonly IPhotoExportService _exportService;
    private readonly ILoggingFacade _logger;

    public ExportSelectedPhotosUseCase(IPhotoExportService exportService, ILoggingFacade logger)
    {
        _exportService = exportService;
        _logger = logger;
    }

    /// <summary>
    /// Exports the specified photos to the target folder.
    /// Validates the target directory and handles logging.
    /// </summary>
    /// <returns>The number of photos successfully exported.</returns>
    public async Task<int> ExecuteAsync(IEnumerable<PhotoIdentity> photos, string destinationPath)
    {
        if (photos == null) throw new ArgumentNullException(nameof(photos));
        if (string.IsNullOrWhiteSpace(destinationPath)) throw new ArgumentNullException(nameof(destinationPath));

        var photoList = photos.ToList();
        if (!photoList.Any()) return 0;

        _logger.Info("ExportUseCase", "Execute", $"Exporting {photoList.Count} photos to: {destinationPath}");

        if (!Directory.Exists(destinationPath))
        {
            _logger.Warn("ExportUseCase", "Execute", "Destination directory does not exist. Creating it.");
            Directory.CreateDirectory(destinationPath);
        }

        try
        {
            await _exportService.ExportToFolderAsync(photoList, destinationPath);
            _logger.Info("ExportUseCase", "Execute", "Export completed successfully.");
            return photoList.Count;
        }
        catch (Exception ex)
        {
            _logger.Error("ExportUseCase", "Execute", "Failed to export photos.", ex);
            throw;
        }
    }
}
