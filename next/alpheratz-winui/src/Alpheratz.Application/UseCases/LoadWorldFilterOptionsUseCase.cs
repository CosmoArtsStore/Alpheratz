using Alpheratz.Contracts.Repositories;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

/// <summary>
/// Use case for retrieving all unique world names listed in the photo library to populate filter options.
/// </summary>
public class LoadWorldFilterOptionsUseCase
{
    private readonly IPhotoReadRepository _repository;

    public LoadWorldFilterOptionsUseCase(IPhotoReadRepository repository)
    {
        _repository = repository;
    }

    /// <summary>
    /// Executes the use case to get unique world names.
    /// </summary>
    /// <returns>A list of world names, sorted alphabetically.</returns>
    public async Task<IEnumerable<string>> ExecuteAsync()
    {
        return await _repository.GetUniqueWorldNamesAsync();
    }
}
