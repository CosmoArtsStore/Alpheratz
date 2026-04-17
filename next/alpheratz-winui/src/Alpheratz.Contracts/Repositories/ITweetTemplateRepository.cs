using Alpheratz.Domain.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Alpheratz.Contracts.Repositories;

public interface ITweetTemplateRepository
{
    Task<IEnumerable<TweetTemplate>> GetAllTemplatesAsync();
    Task<int> UpsertTemplateAsync(TweetTemplate template);
    Task SetActiveTemplateAsync(int templateId);
    Task DeleteTemplateAsync(int templateId);
    Task<TweetTemplate?> GetActiveTemplateAsync();
}
