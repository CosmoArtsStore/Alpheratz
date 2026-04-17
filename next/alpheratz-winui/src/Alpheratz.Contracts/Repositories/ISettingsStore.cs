using Alpheratz.Domain.Entities;
using System.Threading.Tasks;

namespace Alpheratz.Contracts.Repositories;

public interface ISettingsStore
{
    Task<AppSettings> LoadSettingsAsync();
    Task SaveSettingsAsync(AppSettings settings);
}
