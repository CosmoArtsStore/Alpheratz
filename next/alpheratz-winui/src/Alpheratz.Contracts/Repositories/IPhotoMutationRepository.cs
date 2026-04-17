using Alpheratz.Domain.ValueObjects;
using System.Threading.Tasks;

namespace Alpheratz.Contracts.Repositories;

public interface IPhotoMutationRepository
{
    Task BulkUpsertPhotosAsync(System.Collections.Generic.IEnumerable<Alpheratz.Domain.Entities.Photo> photos);
    Task UpdateMemoAsync(PhotoIdentity identity, string memo);
    Task UpdateFavoriteAsync(PhotoIdentity identity, bool favorite);
    Task UpdateWorldMatchAsync(PhotoIdentity identity, WorldIdentity worldIdentity, MatchSource matchSource);
    Task UpdateIsMissingAsync(PhotoIdentity identity, bool isMissing);
    Task BulkUpdateFavoriteAsync(System.Collections.Generic.IEnumerable<PhotoIdentity> identities, bool favorite);
    Task ResetSlotAsync(SourceSlot slot);
    Task DeletePhotoAsync(PhotoIdentity identity);
}
