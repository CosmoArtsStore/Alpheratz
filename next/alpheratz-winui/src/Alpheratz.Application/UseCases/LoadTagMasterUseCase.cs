using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.ValueObjects;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

/// <summary>
/// Domain service for retrieving the global dictionary of categories/tags.
/// Follows Design Doc Section 8.3 / 984.
/// </summary>
public class LoadTagMasterUseCase
{
    private readonly ITagRepository _tagRepository;
    private readonly ILoggingFacade _logger;

    public LoadTagMasterUseCase(ITagRepository tagRepository, ILoggingFacade logger)
    {
        _tagRepository = tagRepository;
        _logger = logger;
    }

    /// <summary>
    /// Fetches all master tags.
    /// Used for auto-completion and tag management UI.
    /// </summary>
    public async Task<IEnumerable<TagName>> ExecuteAsync()
    {
        _logger.Info("TagMasterUseCase", "LoadAll", "Fetching global tag master dictionary.");

        try
        {
            return await _tagRepository.GetTagMasterAsync();
        }
        catch (Exception ex)
        {
            _logger.Error("TagMasterUseCase", "LoadAll", "Failed to retrieve master tags.", ex);
            return Array.Empty<TagName>();
        }
    }
}
