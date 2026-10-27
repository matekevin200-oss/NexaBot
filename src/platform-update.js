const { recordError, recordAudit } = require('./telemetry');
const {dbQuery,isPersistentStore}=require('./config');
const RETIRED=new Set(['crown-city','crown-rp','crownrp','crown_city','ccrp']);

// Retire legacy feature commands and generated templates without touching guild channels or roles.
async function retireLegacyCommands(client) {
  const result = { removed: [], failed: [], templatesCleaned:0, moduleConfigsCleaned:0 };
  if(isPersistentStore())try{
    const changed=await dbQuery(`UPDATE nexabot_guild_configs g SET config=jsonb_set(config,'{applications,templates}',COALESCE((SELECT jsonb_agg(entry) FROM jsonb_array_elements(g.config#>'{applications,templates}') entry WHERE COALESCE(entry->>'key','') !~* '^tgf_crown_'),'[]'::jsonb)),updated_at=NOW() WHERE jsonb_typeof(config#>'{applications,templates}')='array' AND EXISTS(SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(g.config#>'{applications,templates}')='array' THEN g.config#>'{applications,templates}' ELSE '[]'::jsonb END) entry WHERE COALESCE(entry->>'key','') ~* '^tgf_crown_')`);
    result.templatesCleaned=changed?.rowCount||0;
    const modules=await dbQuery(`UPDATE nexabot_guild_configs g SET config=jsonb_set(config,'{modules}',COALESCE((SELECT jsonb_object_agg(key,value) FROM jsonb_each(g.config->'modules') WHERE key !~* '^(crown([_-]?(city|rp))?|ccrp)$'),'{}'::jsonb)),updated_at=NOW() WHERE jsonb_typeof(config->'modules')='object' AND EXISTS(SELECT 1 FROM jsonb_each(CASE WHEN jsonb_typeof(g.config->'modules')='object' THEN g.config->'modules' ELSE '{}'::jsonb END) WHERE key ~* '^(crown([_-]?(city|rp))?|ccrp)$')`);
    result.moduleConfigsCleaned=modules?.rowCount||0;
  }catch(error){result.failed.push('legacy-templates');await recordError(error,{command:'retired_template_cleanup'}).catch(()=>null);}
  const scopes=[...client.guilds.cache.values()].filter(g=>g.commands).map(g=>({id:g.id,commands:g.commands}));
  if(client.application?.commands)scopes.unshift({id:'global',commands:client.application.commands});
  for (const guild of scopes) {
    try {
      const commands = await guild.commands.fetch();
      for (const command of commands.values()) {
        if (!RETIRED.has(command.name)) continue;
        await command.delete();
        result.removed.push(guild.id);
        await recordAudit('retired_command_remove', { guildId: guild.id==='global'?null:guild.id, targetId: command.id });
      }
    } catch (error) {
      result.failed.push(guild.id);
      await recordError(error, { command: 'retired_command_cleanup', guildId: guild.id }).catch(() => null);
    }
  }
  return result;
}

module.exports = { retireLegacyCommands };
