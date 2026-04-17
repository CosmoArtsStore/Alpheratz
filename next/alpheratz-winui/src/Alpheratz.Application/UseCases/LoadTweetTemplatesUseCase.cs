using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

/// <summary>
/// Domain service for retrieving user-configured SNS sharing templates.
/// Follows Design Doc Section 8.3 / 921.
/// </summary>
public class LoadTweetTemplatesUseCase
{
    private readonly ITweetTemplateRepository _templateRepository;
    private readonly ILoggingFacade _logger;

    public LoadTweetTemplatesUseCase(ITweetTemplateRepository templateRepository, ILoggingFacade logger)
    {
        _templateRepository = templateRepository;
        _logger = logger;
    }

    /// <summary>
    /// Fetches all templates from the repository.
    /// </summary>
    public async Task<IReadOnlyList<TweetTemplate>> ExecuteAsync()
    {
        _logger.Info("TweetUseCase", "LoadAll", "Fetching all tweet templates.");

        try
        {
            var results = await _templateRepository.GetAllTemplatesAsync();
            return results ?? new List<TweetTemplate>();
        }
        catch (Exception ex)
        {
            _logger.Error("TweetUseCase", "LoadAll", "Failed to retrieve tweet templates.", ex);
            return new List<TweetTemplate>();
        }
    }
}
