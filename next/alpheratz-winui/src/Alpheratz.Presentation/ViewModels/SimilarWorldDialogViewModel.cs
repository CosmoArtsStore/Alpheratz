using Alpheratz.Application.UseCases;
using Alpheratz.Domain.Models;
using Alpheratz.Domain.ValueObjects;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using System.Collections.ObjectModel;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Alpheratz.Presentation.ViewModels;

/// <summary>
/// Manages the visual state of the similar world name selection dialog.
/// Follows Design Doc Section 8.2 / 589.
/// </summary>
public partial class SimilarWorldDialogViewModel : ObservableObject
{
    private readonly FindSimilarWorldCandidatesUseCase _findCandidates;
    private readonly ApplyWorldMatchUseCase _applyMatch;
    private PhotoIdentity? _targetIdentity;

    [ObservableProperty]
    private bool _isLoading;

    [ObservableProperty]
    private bool _isBusy;

    [ObservableProperty]
    private bool _hasNoCandidates;

    [ObservableProperty]
    private SimilarWorldCandidate? _selectedCandidate;

    public ObservableCollection<SimilarWorldCandidate> Candidates { get; } = new();

    public SimilarWorldDialogViewModel(
        FindSimilarWorldCandidatesUseCase findCandidates,
        ApplyWorldMatchUseCase applyMatch)
    {
        _findCandidates = findCandidates;
        _applyMatch = applyMatch;
    }

    /// <summary>
    /// Initializes the dialog for a specific photo.
    /// </summary>
    public async Task InitializeAsync(PhotoIdentity identity)
    {
        _targetIdentity = identity;
        SelectedCandidate = null;
        Candidates.Clear();
        IsLoading = true;
        HasNoCandidates = false;

        try
        {
            var results = await _findCandidates.ExecuteAsync(identity);
            foreach (var candidate in results)
            {
                Candidates.Add(candidate);
            }
            HasNoCandidates = Candidates.Count == 0;
        }
        finally
        {
            IsLoading = false;
        }
    }

    /// <summary>
    /// Commits the selected candidate as the photo's world name.
    /// </summary>
    [RelayCommand(CanExecute = nameof(CanApply))]
    private async Task ApplyAsync()
    {
        if (SelectedCandidate == null || _targetIdentity == null) return;
        
        IsBusy = true;
        try
        {
            // The candidate has the world name, we need to convert it to WorldIdentity
            // Usually, since it's from another photo, we might have its ID, but for now name is enough
            var world = WorldIdentity.FromName(SelectedCandidate.WorldName);
            await _applyMatch.ExecuteAsync(_targetIdentity, world);
            
            // UI will close via RequestClose or similar mechanism (omitted for brevity)
        }
        finally
        {
            IsBusy = false;
        }
    }

    private bool CanApply() => SelectedCandidate != null && !IsBusy;

    partial void OnSelectedCandidateChanged(SimilarWorldCandidate? value)
    {
        ApplyCommand.NotifyCanExecuteChanged();
    }
}
