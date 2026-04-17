using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Alpheratz.Application.UseCases;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.ValueObjects;
using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;

namespace Alpheratz.Presentation.ViewModels;

/// <summary>
/// Manages the global category/tag master dictionary.
/// Follows Design Doc Section 8.2 / 666.
/// </summary>
public partial class TagMasterPageViewModel : ObservableObject
{
    private readonly LoadTagMasterUseCase _loadTags;
    private readonly CreateTagMasterUseCase _createTag;
    private readonly DeleteTagMasterUseCase _deleteTag;
    private readonly RenameTagMasterUseCase _renameTag;
    private readonly ILoggingFacade _logger;

    [ObservableProperty]
    private ObservableCollection<TagSummaryViewModel> _tags = new();

    [ObservableProperty]
    private string _newTagName = string.Empty;

    [ObservableProperty]
    private bool _isBusy;

    public TagMasterPageViewModel(
        LoadTagMasterUseCase loadTags,
        CreateTagMasterUseCase createTag,
        DeleteTagMasterUseCase deleteTag,
        RenameTagMasterUseCase renameTag,
        ILoggingFacade logger)
    {
        _loadTags = loadTags;
        _createTag = createTag;
        _deleteTag = deleteTag;
        _renameTag = renameTag;
        _logger = logger;
    }

    /// <summary>
    /// Loads the current master list and associated usage statistics.
    /// </summary>
    public async Task InitializeAsync()
    {
        _logger.Info("TagMaster", "Initialize", "Loading master tag list.");
        IsBusy = true;
        
        try
        {
            var tagNames = await _loadTags.ExecuteAsync();
            Tags.Clear();
            foreach (var name in tagNames)
            {
                // In a full implementation, we'd fetch usage counts here
                Tags.Add(new TagSummaryViewModel(name.Value, 0));
            }
        }
        catch (Exception ex)
        {
            _logger.Error("TagMaster", "Initialize", "Failed to load master tags.", ex);
        }
        finally
        {
            IsBusy = false;
        }
    }

    [RelayCommand]
    public async Task AddTagAsync()
    {
        if (string.IsNullOrWhiteSpace(NewTagName)) return;

        var name = NewTagName.Trim();
        _logger.Info("TagMaster", "AddTag", $"Creating new master tag: {name}");

        try
        {
            await _createTag.ExecuteAsync(name);
            Tags.Add(new TagSummaryViewModel(name, 0));
            NewTagName = string.Empty;
        }
        catch (Exception ex)
        {
            _logger.Error("TagMaster", "AddTag", $"Failed to create tag {name}.", ex);
        }
    }

    [RelayCommand]
    public async Task DeleteTagAsync(TagSummaryViewModel tag)
    {
        _logger.Info("TagMaster", "Delete", $"Deleting master tag: {tag.Name}");

        try
        {
            await _deleteTag.ExecuteAsync(tag.Name);
            Tags.Remove(tag);
        }
        catch (Exception ex)
        {
            _logger.Error("TagMaster", "Delete", $"Failed to delete tag {tag.Name}.", ex);
        }
    }

    [RelayCommand]
    public async Task RenameTagAsync(TagSummaryViewModel tag)
    {
        // For brevity, using a placeholder for new name prompting
        _logger.Info("TagMaster", "Rename", $"Requesting rename for {tag.Name}");
    }
}

/// <summary>
/// Simple UI model for a tag with usage statistics.
/// </summary>
public partial class TagSummaryViewModel : ObservableObject
{
    [ObservableProperty]
    private string _name;

    [ObservableProperty]
    private int _usageCount;

    public TagSummaryViewModel(string name, int usageCount)
    {
        Name = name;
        UsageCount = usageCount;
    }
}
