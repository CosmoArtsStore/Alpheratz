using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Alpheratz.Application.UseCases;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;

namespace Alpheratz.Presentation.ViewModels;

/// <summary>
/// Root ViewModel for the duplicate management screen.
/// Follows Design Doc Section 8.2 / 737.
/// </summary>
public partial class DuplicatePageViewModel : ObservableObject
{
    private readonly LoadDuplicateGroupsUseCase _loadGroups;
    private readonly DeletePhotoUseCase _deletePhoto;
    private readonly ILoggingFacade _logger;

    [ObservableProperty]
    private ObservableCollection<DuplicateGroupViewModel> _groups = new();

    [ObservableProperty]
    private bool _isBusy;

    public event Action<DuplicateGroupViewModel>? GroupDismissed;

    public DuplicatePageViewModel(
        LoadDuplicateGroupsUseCase loadGroups,
        DeletePhotoUseCase deletePhoto,
        ILoggingFacade logger)
    {
        _loadGroups = loadGroups;
        _deletePhoto = deletePhoto;
        _logger = logger;
    }

    /// <summary>
    /// Refreshes the list of visually similar photo groups.
    /// </summary>
    public async Task InitializeAsync()
    {
        _logger.Info("Duplicates", "Initialize", "Loading duplicate photo groups.");
        IsBusy = true;
        
        try
        {
            var results = await _loadGroups.ExecuteAsync();
            Groups.Clear();
            foreach (var group in results)
            {
                var vm = new DuplicateGroupViewModel(group, _deletePhoto, _logger);
                vm.DismissRequested += OnGroupDismissed;
                Groups.Add(vm);
            }
        }
        catch (Exception ex)
        {
            _logger.Error("Duplicates", "Initialize", "Failed to load duplicate groups.", ex);
        }
        finally
        {
            IsBusy = false;
        }
    }

    private void OnGroupDismissed(DuplicateGroupViewModel group)
    {
        _logger.Info("Duplicates", "Dismiss", $"Dismissing group {group.GroupId} — all photos kept.");
        Groups.Remove(group);
        GroupDismissed?.Invoke(group);
    }
}

/// <summary>
/// Represents a group of photos identified as duplicates or visually similar.
/// </summary>
public partial class DuplicateGroupViewModel : ObservableObject
{
    private readonly DeletePhotoUseCase _deleteUseCase;
    private readonly ILoggingFacade _logger;

    public string GroupId { get; }
    public ObservableCollection<Photo> Photos { get; }

    public event Action<DuplicateGroupViewModel>? DismissRequested;

    public DuplicateGroupViewModel(
        DuplicateGroup group, 
        DeletePhotoUseCase deleteUseCase,
        ILoggingFacade logger)
    {
        GroupId = group.GroupId;
        Photos = new ObservableCollection<Photo>(group.Photos);
        _deleteUseCase = deleteUseCase;
        _logger = logger;
    }

    [RelayCommand]
    public async Task DeletePhotoAsync(Photo photo)
    {
        _logger.Info("Duplicates", "Delete", $"Deleting photo from duplicate group: {photo.Identity.Value}");
        
        try
        {
            await _deleteUseCase.ExecuteAsync(photo.Identity);
            Photos.Remove(photo);
        }
        catch (Exception ex)
        {
            _logger.Error("Duplicates", "Delete", "Failed to delete photo.", ex);
        }
    }

    /// <summary>
    /// Marks this group as resolved without deleting any photos.
    /// Removes from the visible list so the user can move on.
    /// </summary>
    [RelayCommand]
    public void DismissGroup()
    {
        DismissRequested?.Invoke(this);
    }
}
