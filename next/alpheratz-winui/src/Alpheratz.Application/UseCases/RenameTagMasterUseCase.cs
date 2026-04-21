using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.ValueObjects;
using System;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

/// <summary>
/// Domain service for library-wide renaming of a category.
/// Follows Design Doc Section 8.3 / 971.
/// </summary>
public class RenameTagMasterUseCase
{
    private readonly ITagRepository _tagRepository;
    private readonly ILoggingFacade _logger;

    public RenameTagMasterUseCase(ITagRepository tagRepository, ILoggingFacade logger)
    {
        _tagRepository = tagRepository;
        _logger = logger;
    }

    /// <summary>
    /// Executes the rename operation. 
    /// This typically involves updating both the master record and joining table.
    /// </summary>
    public async Task ExecuteAsync(string oldName, string newName)
    {
        if (string.IsNullOrWhiteSpace(oldName) || string.IsNullOrWhiteSpace(newName)) return;
        if (oldName == newName) return;

        var oldTag = new TagName(oldName);
        var newTag = new TagName(newName);

        _logger.Info("TagMasterUseCase", "Rename", $"Renaming master tag '{oldTag.Value}' to '{newTag.Value}'.");

        try
        {
            // The repository handles the transactional update of all related records.
            await _tagRepository.RenameTagMasterAsync(oldTag, newTag);
        }
        catch (Exception ex)
        {
            _logger.Error("TagMasterUseCase", "Rename", $"Failed to rename tag '{oldTag.Value}'.", ex);
            throw;
        }
    }
}
