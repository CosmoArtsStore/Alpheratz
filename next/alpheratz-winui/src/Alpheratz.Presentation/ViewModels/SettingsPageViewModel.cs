using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Alpheratz.Application.UseCases;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.Settings;
using Alpheratz.Domain.ValueObjects;
using Alpheratz.Domain.Entities;
using System;
using System.Threading.Tasks;

namespace Alpheratz.Presentation.ViewModels;

/// <summary>
/// Manages application configuration and system integration settings.
/// Follows Design Doc Section 8.2 / 705.
/// </summary>
public partial class SettingsPageViewModel : ObservableObject
{
    private readonly LoadSettingsUseCase _loadSettings;
    private readonly SaveSettingsUseCase _saveSettings;
    private readonly ResetPhotoFolderUseCase _resetFolder;
    private readonly RestoreBackupUseCase _restoreBackup;
    private readonly ILoggingFacade _logger;

    [ObservableProperty]
    private string _photoFolderPath = string.Empty;

    [ObservableProperty]
    private string _secondaryPhotoFolderPath = string.Empty;

    [ObservableProperty]
    private ThemeMode _selectedTheme;

    [ObservableProperty]
    private bool _runAtStartup;

    [ObservableProperty]
    private bool _isBusy;

    public SettingsPageViewModel(
        LoadSettingsUseCase loadSettings,
        SaveSettingsUseCase saveSettings,
        ResetPhotoFolderUseCase resetFolder,
        RestoreBackupUseCase restoreBackup,
        ILoggingFacade logger)
    {
        _loadSettings = loadSettings;
        _saveSettings = saveSettings;
        _resetFolder = resetFolder;
        _restoreBackup = restoreBackup;
        _logger = logger;
    }

    /// <summary>
    /// Loads initial settings state from the store.
    /// </summary>
    public async Task InitializeAsync()
    {
        _logger.Info("Settings", "Initialize", "Loading application settings.");
        try
        {
            var settings = await _loadSettings.ExecuteAsync();
            
            PhotoFolderPath = settings.PhotoFolderPath;
            SecondaryPhotoFolderPath = settings.SecondaryPhotoFolderPath ?? string.Empty;
            SelectedTheme = settings.Theme;
            RunAtStartup = settings.EnableStartup;
        }
        catch (Exception ex)
        {
            _logger.Error("Settings", "Initialize", "Failed to load settings.", ex);
        }
    }

    /// <summary>
    /// Persists current UI state to the settings store.
    /// </summary>
    [RelayCommand]
    public async Task SaveAsync()
    {
        _logger.Info("Settings", "Save", "Saving user configuration changes.");
        IsBusy = true;
        
        try
        {
            var settings = new AppSettings
            {
                PhotoFolderPath = PhotoFolderPath,
                SecondaryPhotoFolderPath = SecondaryPhotoFolderPath,
                Theme = SelectedTheme,
                EnableStartup = RunAtStartup
            };

            await _saveSettings.ExecuteAsync(settings);
            
            _logger.Info("Settings", "Save", "Settings saved successfully.");
        }
        catch (Exception ex)
        {
            _logger.Error("Settings", "Save", "Failed to save settings.", ex);
        }
        finally
        {
            IsBusy = false;
        }
    }

    [RelayCommand]
    public async Task PickFolderAsync(string slot)
    {
        // Placeholder for folder picker integration via DialogCoordinator or IFileSystemService
        _logger.Info("Settings", "PickFolder", $"Opening folder picker for slot: {slot}");
        await Task.CompletedTask;
    }

    [RelayCommand]
    public async Task ResetFolderAsync(Alpheratz.Domain.ValueObjects.SourceSlot slot)
    {
        _logger.Info("Settings", "ResetFolder", $"Resetting slot {slot.Value}.");
        IsBusy = true;
        try
        {
            await _resetFolder.ExecuteAsync(slot, createBackupBeforeReset: true);
            _logger.Info("Settings", "ResetFolder", "Folder reset successful.");
        }
        catch (Exception ex)
        {
            _logger.Error("Settings", "ResetFolder", "Failed to reset folder.", ex);
        }
        finally
        {
            IsBusy = false;
        }
    }

    [RelayCommand]
    public async Task RestoreBackupAsync(Alpheratz.Domain.Entities.BackupDescriptor backup)
    {
        if (backup == null) return;
        _logger.Info("Settings", "RestoreBackup", $"Restoring backup: {backup.DisplayName}.");
        IsBusy = true;
        try
        {
            await _restoreBackup.ExecuteAsync(backup);
            _logger.Info("Settings", "RestoreBackup", "Backup restored successfully.");
        }
        catch (Exception ex)
        {
            _logger.Error("Settings", "RestoreBackup", "Failed to restore backup.", ex);
        }
        finally
        {
            IsBusy = false;
        }
    }
}
