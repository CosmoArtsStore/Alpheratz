using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Alpheratz.Application.UseCases;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.Entities;
using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;

namespace Alpheratz.Presentation.ViewModels;

/// <summary>
/// Manages user-defined templates for Twitter/SNS sharing.
/// Follows Design Doc Section 8.2 / 684.
/// </summary>
public partial class TweetTemplatePageViewModel : ObservableObject
{
    private readonly LoadTweetTemplatesUseCase _loadTemplates;
    private readonly SaveTweetTemplateUseCase _saveTemplate;
    private readonly ILoggingFacade _logger;

    [ObservableProperty]
    private ObservableCollection<TweetTemplate> _templates = new();

    [ObservableProperty]
    private TweetTemplate? _selectedTemplate;

    [ObservableProperty]
    private string _editingContent = string.Empty;

    [ObservableProperty]
    private string _previewText = string.Empty;

    public ObservableCollection<string> AvailableVariables { get; } = new(new[]
    {
        "world",
        "tags",
        "memo",
        "date"
    });

    public TweetTemplatePageViewModel(
        LoadTweetTemplatesUseCase loadTemplates,
        SaveTweetTemplateUseCase saveTemplate,
        ILoggingFacade logger)
    {
        _loadTemplates = loadTemplates;
        _saveTemplate = saveTemplate;
        _logger = logger;
    }

    /// <summary>
    /// Loads all templates from the store.
    /// </summary>
    public async Task InitializeAsync()
    {
        _logger.Info("TweetTemplate", "Initialize", "Loading all tweet templates.");
        try
        {
            var templates = await _loadTemplates.ExecuteAsync();
            Templates.Clear();
            foreach (var t in templates)
            {
                Templates.Add(t);
            }
            SelectedTemplate = Templates.FirstOrDefault(t => t.IsActive) ?? Templates.FirstOrDefault();
        }
        catch (Exception ex)
        {
            _logger.Error("TweetTemplate", "Initialize", "Failed to load tweet templates.", ex);
        }
    }

    [RelayCommand]
    public async Task SaveEditingContentAsync()
    {
        if (SelectedTemplate == null) return;
        
        _logger.Info("TweetTemplate", "Save", $"Saving content for template {SelectedTemplate.Id}.");
        try
        {
            var updated = new TweetTemplate(SelectedTemplate.Id, SelectedTemplate.Name, EditingContent, SelectedTemplate.IsActive);
            await _saveTemplate.ExecuteAsync(updated);
            
            // Local sync
            var idx = Templates.IndexOf(SelectedTemplate);
            if (idx >= 0) Templates[idx] = updated;
            SelectedTemplate = updated;
        }
        catch (Exception ex)
        {
            _logger.Error("TweetTemplate", "Save", "Failed to save tweet template.", ex);
        }
    }

    [RelayCommand]
    public void InsertVariable(string variable)
    {
        // Simple append for now
        EditingContent += $" {{{variable}}} ";
    }

    partial void OnEditingContentChanged(string value)
    {
        UpdatePreview(value);
    }

    private void UpdatePreview(string content)
    {
        // Simulated preview with placeholder data
        PreviewText = content
            .Replace("{world}", "Great Pug")
            .Replace("{tags}", "#VRChat #Photo");
    }

    partial void OnSelectedTemplateChanged(TweetTemplate? value)
    {
        EditingContent = value?.TemplateText ?? string.Empty;
        UpdatePreview(EditingContent);
    }
}
