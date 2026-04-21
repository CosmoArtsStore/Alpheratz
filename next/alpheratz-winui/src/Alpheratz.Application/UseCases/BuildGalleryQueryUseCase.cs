using System.Collections.Generic;
using System.Text;

namespace Alpheratz.Application.UseCases;

public record GallerySqlQuery(string Sql, object Parameters);

public class BuildGalleryQueryUseCase
{
    public GallerySqlQuery Execute(string searchText, bool favoritesOnly, string? worldName)
    {
        var sql = new StringBuilder("SELECT * FROM photos WHERE is_missing = 0");
        var parameters = new Dictionary<string, object>();

        if (favoritesOnly)
        {
            sql.Append(" AND is_favorite = 1");
        }

        if (!string.IsNullOrEmpty(worldName))
        {
            sql.Append(" AND world_name = @WorldName");
            parameters.Add("WorldName", worldName);
        }

        if (!string.IsNullOrEmpty(searchText))
        {
            // Complex search matching world, filename, or memo
            sql.Append(@" AND (
                world_name LIKE @Search OR 
                photo_filename LIKE @Search OR 
                memo LIKE @Search OR
                photo_path IN (SELECT photo_path FROM photo_tags pt JOIN tags t ON pt.tag_id = t.id WHERE t.name LIKE @Search)
            )");
            parameters.Add("Search", $"%{searchText}%");
        }

        return new GallerySqlQuery(sql.ToString(), parameters);
    }
}
