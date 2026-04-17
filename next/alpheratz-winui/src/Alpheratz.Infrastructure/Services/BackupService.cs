using Alpheratz.Contracts.Services;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Infrastructure.Database;
using Alpheratz.Domain.Entities;
using Alpheratz.Domain.ValueObjects;
using Dapper;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Services;

/// <summary>
/// Infrastructure service for database and configuration backups.
/// Follows Design Doc Section 8.4 / 1021.
/// </summary>
public class BackupService : IBackupService
{
    private readonly IPathLayoutService _pathLayout;
    private readonly SqliteConnectionFactory _connectionFactory;
    private readonly ILoggingFacade _logger;

    public BackupService(
        IPathLayoutService pathLayout, 
        SqliteConnectionFactory connectionFactory,
        ILoggingFacade logger)
    {
        _pathLayout = pathLayout;
        _connectionFactory = connectionFactory;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<IEnumerable<BackupDescriptor>> GetBackupCandidatesAsync(PhotoFolder folder, SourceSlot slot)
    {
        var backupDir = Path.Combine(_pathLayout.AppDataRoot, "backup", $"slot{slot.Value}");
        if (!Directory.Exists(backupDir)) return Enumerable.Empty<BackupDescriptor>();

        var files = Directory.GetFiles(backupDir, "alpheratz_*.db")
            .Select(f => new FileInfo(f))
            .OrderByDescending(f => f.CreationTime)
            .Select(f => new BackupDescriptor(f.FullName, f.CreationTime))
            .ToList();

        return await Task.FromResult(files);
    }

    /// <inheritdoc/>
    public async Task CreateBackupAsync(PhotoFolder folder, SourceSlot slot)
    {
        var dbPath = _pathLayout.DatabasePath;
        var backupDir = Path.Combine(_pathLayout.AppDataRoot, "backup", $"slot{slot.Value}");
        if (!Directory.Exists(backupDir)) Directory.CreateDirectory(backupDir);

        var timestamp = DateTime.Now.ToString("yyyyMMddHHmmss");
        var backupPath = Path.Combine(backupDir, $"alpheratz_{timestamp}.db");

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            // SQLite 'VACUUM INTO' is a safe way to backup a hot database.
            await connection.ExecuteAsync($"VACUUM INTO '{backupPath.Replace("'", "''")}' ");
            _logger.Info("BackupService", "Create", $"Backup created at {backupPath} for slot {slot.Value}");
        }
        catch (Exception ex)
        {
            _logger.Error("BackupService", "Create", $"Database backup failed for slot {slot.Value}.", ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task RestoreBackupAsync(BackupDescriptor backup)
    {
        var dbPath = _pathLayout.DatabasePath;
        if (!File.Exists(backup.FilePath))
        {
            _logger.Error("BackupService", "Restore", $"Backup file does not exist: {backup.FilePath}");
            return;
        }

        try
        {
            // Simple overwrite (In production, you'd close all connections first)
            File.Copy(backup.FilePath, dbPath, true);
            _logger.Info("BackupService", "Restore", $"Database restored from {backup.FilePath}");
        }
        catch (Exception ex)
        {
            _logger.Error("BackupService", "Restore", "Restore failed.", ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public Task CleanupOldBackupsAsync()
    {
        // Retain latest 10 backups logic could go here.
        return Task.CompletedTask;
    }
}
