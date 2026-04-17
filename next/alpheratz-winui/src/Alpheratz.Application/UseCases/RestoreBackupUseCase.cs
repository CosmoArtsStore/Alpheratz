using Alpheratz.Contracts.Services;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

public class RestoreBackupUseCase
{
    private readonly IBackupService _backupService;

    public RestoreBackupUseCase(IBackupService backupService)
    {
        _backupService = backupService;
    }

    public async Task ExecuteAsync(Alpheratz.Domain.Entities.BackupDescriptor backup)
    {
        await _backupService.RestoreBackupAsync(backup);
    }
}
