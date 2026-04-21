using Alpheratz.Domain.Entities;
using System.Threading.Tasks;

namespace Alpheratz.Contracts.Settings;

public interface ISettingsStore
{
    Task<AppSettings> LoadSettingsAsync();
    Task SaveSettingsAsync(AppSettings settings);
}
