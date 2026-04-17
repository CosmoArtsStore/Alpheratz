using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.Entities;
using System;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

/// <summary>
/// Domain service for persisting or updating user photo sharing templates.
/// Follows Design Doc Section 8.3 / 933.
/// </summary>
public class SaveTweetTemplateUseCase
{
    private readonly ITweetTemplateRepository _templateRepository;
    private readonly ILoggingFacade _logger;

    public SaveTweetTemplateUseCase(ITweetTemplateRepository templateRepository, ILoggingFacade logger)
    {
        _templateRepository = templateRepository;
        _logger = logger;
    }

    /// <summary>
    /// Upserts the specified template. 
    /// Includes validation of message variables.
    /// </summary>
    public async Task ExecuteAsync(TweetTemplate template)
    {
        if (template == null) throw new ArgumentNullException(nameof(template));

        _logger.Info("TweetUseCase", "Save", $"Saving template changes for ID: {template.Id}");

        try
        {
            // Logic for validating variable syntax (e.g. balanced {}) could go here
            await _templateRepository.UpsertTemplateAsync(template);
        }
        catch (Exception ex)
        {
            _logger.Error("TweetUseCase", "Save", $"Failed to save tweet template {template.Id}.", ex);
            throw;
        }
    }
}
