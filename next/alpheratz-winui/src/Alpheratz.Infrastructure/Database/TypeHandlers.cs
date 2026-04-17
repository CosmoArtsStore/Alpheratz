using Dapper;
using Alpheratz.Domain.ValueObjects;
using System;
using System.Data;

namespace Alpheratz.Infrastructure.Database;

public class PhotoIdentityTypeHandler : SqlMapper.TypeHandler<PhotoIdentity>
{
    public override void SetValue(IDbDataParameter parameter, PhotoIdentity value)
    {
        parameter.Value = value.Value;
    }

    public override PhotoIdentity Parse(object value)
    {
        return new PhotoIdentity((string)value);
    }
}

public class SourceSlotTypeHandler : SqlMapper.TypeHandler<SourceSlot>
{
    public override void SetValue(IDbDataParameter parameter, SourceSlot value)
    {
        parameter.Value = value.Value;
    }

    public override SourceSlot Parse(object value)
    {
        return SourceSlot.FromInt(Convert.ToInt32(value));
    }
}

public class PhotoTimestampTypeHandler : SqlMapper.TypeHandler<PhotoTimestamp>
{
    public override void SetValue(IDbDataParameter parameter, PhotoTimestamp value)
    {
        parameter.Value = value.Value;
    }

    public override PhotoTimestamp Parse(object value)
    {
        return new PhotoTimestamp((string)value);
    }
}

public class TagNameTypeHandler : SqlMapper.TypeHandler<TagName>
{
    public override void SetValue(IDbDataParameter parameter, TagName value)
    {
        parameter.Value = value.Value;
    }

    public override TagName Parse(object value)
    {
        return new TagName((string)value);
    }
}

public static class DapperTypeHandlerSetup
{
    public static void Initialize()
    {
        SqlMapper.AddTypeHandler(new PhotoIdentityTypeHandler());
        SqlMapper.AddTypeHandler(new SourceSlotTypeHandler());
        SqlMapper.AddTypeHandler(new PhotoTimestampTypeHandler());
        SqlMapper.AddTypeHandler(new TagNameTypeHandler());
    }
}
