using Alpheratz.Domain.ValueObjects;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Alpheratz.Contracts.Services;

public interface IPhotoExportService
{
    Task OpenInExplorerAsync(PhotoIdentity identity);
    Task CopyToClipboardAsync(IEnumerable<PhotoIdentity> identities);
    Task ExportToFolderAsync(IEnumerable<PhotoIdentity> identities, string targetFolderPath);
}
