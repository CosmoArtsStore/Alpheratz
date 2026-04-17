using Alpheratz.Domain.ValueObjects;

namespace Alpheratz.Contracts.Repositories;

public interface ITagRepository
{
    Task<IEnumerable<TagName>> GetTagMasterAsync();
    Task CreateTagMasterAsync(TagName tag);
    Task DeleteTagMasterAsync(TagName tag);
    Task RenameTagMasterAsync(TagName oldName, TagName newName);
    
    Task AddPhotoTagAsync(PhotoIdentity photo, TagName tag);
    Task RemovePhotoTagAsync(PhotoIdentity photo, TagName tag);
    Task<IEnumerable<TagName>> GetTagsForPhotoAsync(PhotoIdentity photo);
    Task BulkAddPhotoTagsAsync(System.Collections.Generic.IEnumerable<PhotoIdentity> photos, System.Collections.Generic.IEnumerable<TagName> tags);
}
