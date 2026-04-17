using Alpheratz.Contracts.Repositories;
using Alpheratz.Domain.ValueObjects;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;

namespace Alpheratz.Presentation.ViewModels;

public partial class BulkTagDialogViewModel : ObservableObject
{
    private readonly ITagRepository _tagRepository;
    private readonly IEnumerable<PhotoIdentity> _targetPhotos;

    [ObservableProperty]
    private string _newTagName = string.Empty;

    [ObservableProperty]
    private ObservableCollection<string> _appliedTags = new();

    public BulkTagDialogViewModel(ITagRepository tagRepository, IEnumerable<PhotoIdentity> targetPhotos)
    {
        _tagRepository = tagRepository;
        _targetPhotos = targetPhotos;
    }

    [RelayCommand]
    public async Task ApplyBulkTagAsync()
    {
        if (string.IsNullOrWhiteSpace(NewTagName)) return;
        
        var tag = new TagName(NewTagName);
        foreach (var photo in _targetPhotos)
        {
            await _tagRepository.AddPhotoTagAsync(photo, tag);
        }
        
        if (!AppliedTags.Contains(NewTagName))
            AppliedTags.Add(NewTagName);
            
        NewTagName = string.Empty;
    }

    [RelayCommand]
    public async Task RemoveBulkTagAsync(string tagName)
    {
        var tag = new TagName(tagName);
        foreach (var photo in _targetPhotos)
        {
            await _tagRepository.RemovePhotoTagAsync(photo, tag);
        }
        AppliedTags.Remove(tagName);
    }
}
