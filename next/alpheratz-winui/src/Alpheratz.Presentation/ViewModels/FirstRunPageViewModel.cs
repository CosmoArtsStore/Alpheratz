using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Alpheratz.Application.UseCases;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.ValueObjects;
using System;
using System.Threading.Tasks;

namespace Alpheratz.Presentation.ViewModels;

/// <summary>
/// Orchestrates the initial application setup wizard.
/// Follows Design Doc Section 8.2 / 723.
/// </summary>
public partial class FirstRunPageViewModel : ObservableObject
{
    private readonly ChangePhotoFolderUseCase _changeFolder;
    private readonly ILoggingFacade _logger;

    public event Action? SetupCompleted;

    [ObservableProperty]
    private int _currentStep = 1; // 1: Welcome, 2: Path, 3: Scan

    [ObservableProperty]
    private string _selectedPath = string.Empty;

    [ObservableProperty]
    private bool _isProcessing;

    [ObservableProperty]
    private string _statusMessage = string.Empty;

    [ObservableProperty]
    private double _progress;

    public FirstRunPageViewModel(ChangePhotoFolderUseCase changeFolder, ILoggingFacade logger)
    {
        _changeFolder = changeFolder;
        _logger = logger;
    }

    [RelayCommand]
    public void GoToNextStep()
    {
        CurrentStep++;
        _logger.Info("FirstRun", "StepChange", $"Moved to step {CurrentStep}.");
    }

    [RelayCommand]
    public void GoToPreviousStep()
    {
        if (CurrentStep > 1) CurrentStep--;
    }

    /// <summary>
    /// Finalizes the path selection and triggers the initial background scan.
    /// </summary>
    [RelayCommand]
    public async Task StartSetupAsync()
    {
        if (string.IsNullOrWhiteSpace(SelectedPath))
        {
            StatusMessage = "Please select a valid folder path.";
            return;
        }

        _logger.Info("FirstRun", "Start", $"Starting initial setup for path: {SelectedPath}");
        IsProcessing = true;
        CurrentStep = 3;

        try
        {
            // Initial scan progress monitoring
            var progressHandler = new Progress<Alpheratz.Domain.Models.ScanProgressSnapshot>(p => 
            {
                Progress = p.TotalCount > 0 ? (double)p.ProcessedCount / p.TotalCount * 100 : 0;
                StatusMessage = $"Processing {p.ProcessedCount} of {p.TotalCount} photos...";
            });

            await _changeFolder.ExecuteAsync(new PhotoFolder(SelectedPath, SourceSlot.Slot1), progressHandler);
            
            _logger.Info("FirstRun", "Complete", "Setup completed successfully.");
            StatusMessage = "Setup complete! Launching Alpheratz...";
            
            await Task.Delay(1000); // UI pause to show completion
            SetupCompleted?.Invoke();
        }
        catch (Exception ex)
        {
            _logger.Error("FirstRun", "Failed", "Setup failed during initial scan.", ex);
            StatusMessage = "Setup failed. Please check the folder path and try again.";
            CurrentStep = 2; // Return to path selection
        }
        finally
        {
            IsProcessing = false;
        }
    }
}
