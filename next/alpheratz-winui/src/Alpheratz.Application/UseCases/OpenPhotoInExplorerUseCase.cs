using Alpheratz.Contracts.Services;
using Alpheratz.Domain.ValueObjects;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

public class OpenPhotoInExplorerUseCase
{
    private readonly IPhotoExportService _exportService;

    public OpenPhotoInExplorerUseCase(IPhotoExportService exportService)
    {
        _exportService = exportService;
    }

    public async Task ExecuteAsync(PhotoIdentity identity)
    {
        await _exportService.OpenInExplorerAsync(identity);
    }
}
