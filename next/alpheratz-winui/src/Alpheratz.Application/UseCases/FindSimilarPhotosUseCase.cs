using Alpheratz.Contracts.Repositories;
using Alpheratz.Domain.Entities;
using Alpheratz.Domain.ValueObjects;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

public class FindSimilarPhotosUseCase
{
    private readonly ISimilarCandidateRepository _similarRepo;
    private readonly IPhotoReadRepository _photoRead;

    public FindSimilarPhotosUseCase(ISimilarCandidateRepository similarRepo, IPhotoReadRepository photoRead)
    {
        _similarRepo = similarRepo;
        _photoRead = photoRead;
    }

    public async Task<IEnumerable<Photo>> ExecuteAsync(PhotoIdentity targetIdentity)
    {
        var detail = await _photoRead.GetPhotoDetailAsync(targetIdentity);
        if (detail == null || string.IsNullOrEmpty(detail.Photo.PdqHash)) return Enumerable.Empty<Photo>();

        // We use the repository to find bit-distance candidates
        var candidates = await _similarRepo.GetCandidatesAsync(targetIdentity, detail.Photo.PdqHash);
        
        var results = new List<Photo>();
        foreach (var c in candidates)
        {
            var p = await _photoRead.GetPhotoDetailAsync(c.CandidatePhoto);
            if (p != null) results.Add(p.Photo);
        }

        return results;
    }
}
