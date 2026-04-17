using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Alpheratz.Application.UseCases;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.Entities;
using Alpheratz.Domain.ValueObjects;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;

namespace Alpheratz.Presentation.ViewModels;

/// <summary>
/// Handles real-time tag management for the selected photo.
/// Follows Design Doc Section 8.2 / 634.
/// </summary>
public partial class PhotoTagEditorViewModel : ObservableObject
{
    private readonly AddPhotoTagUseCase _addTag;
    private readonly RemovePhotoTagUseCase _removeTag;
    private readonly ILoggingFacade _logger;
    private Photo? _currentPhoto;

    public ObservableCollection<string> AttachedTags { get; } = new();
    public ObservableCollection<string> Suggestions { get; } = new();

    [ObservableProperty]
    private string _newTagText = string.Empty;

    public PhotoTagEditorViewModel(
        AddPhotoTagUseCase addTag,
        RemovePhotoTagUseCase removeTag,
        ILoggingFacade logger)
    {
        _addTag = addTag;
        _removeTag = removeTag;
        _logger = logger;
    }

    /// <summary>
    /// Updates available tags and current photo context.
    /// </summary>
    public void Update(Photo photo, IEnumerable<TagName> tags)
    {
        _currentPhoto = photo;
        AttachedTags.Clear();
        foreach (var tag in tags)
        {
            AttachedTags.Add(tag.Value);
        }
    }

    public void Clear()
    {
        _currentPhoto = null;
        AttachedTags.Clear();
        Suggestions.Clear();
        NewTagText = string.Empty;
    }

    [RelayCommand]
    private async Task AddTagAsync()
    {
        if (_currentPhoto == null || string.IsNullOrWhiteSpace(NewTagText)) return;

        var name = new TagName(NewTagText.Trim());
        _logger.Info("TagEditor", "AddTag", $"Adding tag '{name.Value}' to photo.");

        try
        {
            await _addTag.ExecuteAsync(_currentPhoto.Identity, name);
            if (!AttachedTags.Contains(name.Value))
            {
                AttachedTags.Add(name.Value);
            }
            NewTagText = string.Empty;
        }
        catch (Exception ex)
        {
            _logger.Error("TagEditor", "AddTag", $"Failed to add tag '{name.Value}'.", ex);
        }
    }

    [RelayCommand]
    private async Task RemoveTagAsync(string tagName)
    {
        if (_currentPhoto == null) return;

        var name = new TagName(tagName);
        _logger.Info("TagEditor", "RemoveTag", $"Removing tag '{name.Value}' from photo.");

        try
        {
            await _removeTag.ExecuteAsync(_currentPhoto.Identity, name);
            AttachedTags.Remove(name.Value);
        }
        catch (Exception ex)
        {
            _logger.Error("TagEditor", "RemoveTag", $"Failed to remove tag '{name.Value}'.", ex);
        }
    }
}
