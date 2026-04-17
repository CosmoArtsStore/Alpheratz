using Alpheratz.Contracts.Interfaces;
using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.Queries;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

/// <summary>
/// Domain-centric service for initiating an analysis of photos with unknown world names.
/// Follows Design Doc Section 8.3 / 1102.
/// </summary>
public class StartUnknownWorldAnalysisUseCase
{
    private readonly IPdqSimilarityService _similarityService;
    private readonly IBackgroundJobService _jobService;
    private readonly IPhotoReadRepository _photoRead;
    private readonly ILoggingFacade _logger;

    public StartUnknownWorldAnalysisUseCase(
        IPdqSimilarityService similarityService,
        IBackgroundJobService jobService,
        IPhotoReadRepository photoRead,
        ILoggingFacade logger)
    {
        _similarityService = similarityService;
        _jobService = jobService;
        _photoRead = photoRead;
        _logger = logger;
    }

    /// <summary>
    /// Starts a background job to analyze unknown worlds by comparing perceptual hashes.
    /// </summary>
    public async Task ExecuteAsync()
    {
        if (_jobService.IsBusy)
        {
            _logger.Warn("AnalysisUseCase", "Start", "A background job is already running. Skipping.");
            return;
        }

        _logger.Info("AnalysisUseCase", "Start", "Initiating unknown world analysis job.");

        await _jobService.EnqueueJobAsync(async (ct) =>
        {
            _logger.Info("AnalysisJob", "Run", "Background analysis job started.");
            
            try
            {
                // In a real implementation, this would:
                // 1. Identify all photos with unknown world names.
                // 2. For each, search for similar photos with known world names.
                // 3. Populate similar_world_candidates cache.
                
                // For now, we simulate the work to establish the UseCase structure.
                await Task.Delay(2000, ct); 
                
                _logger.Info("AnalysisJob", "Run", "Background analysis job completed successfully.");
            }
            catch (OperationCanceledException)
            {
                _logger.Warn("AnalysisJob", "Run", "Background analysis job was cancelled.");
            }
            catch (Exception ex)
            {
                _logger.Error("AnalysisJob", "Run", "Background analysis job failed.", ex);
            }

        }, "Analyzing unknown world names via visual similarity");
    }
}
