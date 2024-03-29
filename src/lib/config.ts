import * as _ from 'lodash'
import * as Zod from 'zod';
import * as Crypto from 'crypto';
import * as Semver from 'semver';

export const ConfigOptionsSchema = Zod.object({
    autoCommitSubmodules: Zod.boolean().optional()
});

export const ConfigMessageTemplate = Zod.object({
    name: Zod.string(),
    message: Zod.string()
});
export const ConfigTagTemplate = Zod.object({
    name: Zod.string(),
    tag: Zod.string(),
    annotation: Zod.string().optional()
});

export const ConfigTaggingSchema = Zod.object({
    name: Zod.string(),
    annotation: Zod.string().optional()
});
export const ConfigSubmoduleSchema = Zod.object({
    name: Zod.string(),
    path: Zod.string(),
    url: Zod.string().optional(),
    tags: Zod.string().array().optional(),
    labels: Zod.record(Zod.string(), Zod.union([ Zod.string(), Zod.string().array() ])).optional(),
    annotations: Zod.record(Zod.string(), Zod.unknown()).optional()
});
export const ConfigFeatureSchema = Zod.object({
    name: Zod.string(),
    branchName: Zod.string(),
    sourceSha: Zod.string(),
    version: Zod.string().optional(),
    upstream: Zod.string().optional(),
    tags: ConfigTaggingSchema.array().optional()
});
export const ConfigReleaseSchema = Zod.object({
    name: Zod.string(),
    branchName: Zod.string(),
    sourceSha: Zod.string(),
    version: Zod.string().optional(),
    upstream: Zod.string().optional(),
    intermediate: Zod.boolean().optional(),
    tags: ConfigTaggingSchema.array().optional()
});
export const ConfigHotfixSchema = Zod.object({
    name: Zod.string(),
    branchName: Zod.string(),
    sourceSha: Zod.string(),
    version: Zod.string().optional(),
    upstream: Zod.string().optional(),
    intermediate: Zod.boolean().optional(),
    tags: ConfigTaggingSchema.array().optional()
});
export const ConfigSupportSchema = Zod.object({
    name: Zod.string(),
    masterBranchName: Zod.string(),
    developBranchName: Zod.string(),
    sourceSha: Zod.string(),
    developVersion: Zod.string().optional(),
    masterVersion: Zod.string().optional(),
    upstream: Zod.string().optional(),
    features: ConfigFeatureSchema.array().optional(),
    releases: ConfigReleaseSchema.array().optional(),
    hotfixes: ConfigHotfixSchema.array().optional()
});
export const ConfigIntegrationSchema = Zod.object({
    plugin: Zod.string(),
    options: Zod.record(Zod.string(), Zod.unknown()).optional()
});
export const ConfigSchema = Zod.object({
    apiVersion: Zod.string().optional(),
    identifier: Zod.string(),
    managed: Zod.boolean().optional(),
    version: Zod.string().optional(),
    developVersion: Zod.string().optional(),
    masterVersion: Zod.string().optional(),
    upstreams: Zod.object({
        name: Zod.string(),
        url: Zod.string()
    }).array().optional(),
    submodules: ConfigSubmoduleSchema.array().optional(),
    features: ConfigFeatureSchema.array().optional(),
    releases: ConfigReleaseSchema.array().optional(),
    hotfixes: ConfigHotfixSchema.array().optional(),
    supports: ConfigSupportSchema.array().optional(),
    included: Zod.string().array().optional(),
    excluded: Zod.string().array().optional(),
    featureMessageTemplate: Zod.string().optional(),
    releaseMessageTemplate: Zod.string().optional(),
    hotfixMessageTemplate: Zod.string().optional(),
    releaseTagTemplate: Zod.string().optional(),
    hotfixTagTemplate: Zod.string().optional(),
    tags: Zod.string().array().optional(),
    integrations: ConfigIntegrationSchema.array().optional(),
    commitMessageTemplates: ConfigMessageTemplate.array().optional(),
    tagTemplates: ConfigTagTemplate.array().optional(),
    masterBranchName: Zod.string().optional(),
    developBranchName: Zod.string().optional(),
    dependencies: Zod.union([
        Zod.string(),
        Zod.record(Zod.string())
    ]).array().optional(),
    labels: Zod.record(Zod.string(), Zod.union([ Zod.string(), Zod.string().array() ])).optional(),
    annotations: Zod.record(Zod.string(), Zod.unknown()).optional()
});

export type RecursiveConfigSubmoduleSchema = Zod.infer<typeof ConfigSubmoduleSchema> & {
    config?: RecursiveConfigSchema
};
export const RecursiveConfigSubmoduleSchema: Zod.ZodType<RecursiveConfigSubmoduleSchema> = Zod.lazy(() => ConfigSubmoduleSchema.extend({
    config: RecursiveConfigSchema.optional()
}));

export type RecursiveConfigSchema = Zod.infer<typeof ConfigSchema> & {
    submodules?: RecursiveConfigSubmoduleSchema[];
};
export const RecursiveConfigSchema: Zod.ZodType<RecursiveConfigSchema> = Zod.lazy(() => ConfigSchema.extend({
    submodules: RecursiveConfigSubmoduleSchema.array().optional()
}));

export const API_VERSION = 'v1.5';
export function resolveApiVersion() {
    const version = Semver.coerce(API_VERSION);
    if (!version)
        throw new Error(`Version "${API_VERSION}" is not a valid semver format`);

    return version.toString();
}

export class ConfigBase {
    readonly apiVersion?: string;
    readonly identifier!: string;
    readonly managed!: boolean;
    readonly developVersion?: string;
    readonly masterVersion?: string;
    readonly upstreams!: readonly {
        readonly name: string;
        readonly url: string
    }[];
    readonly submodules!: readonly SubmoduleBase[];
    readonly features!: readonly FeatureBase[];
    readonly releases!: readonly ReleaseBase[];
    readonly hotfixes!: readonly HotfixBase[];
    readonly supports!: readonly SupportBase[];
    readonly included!: readonly string[];
    readonly excluded!: readonly string[];
    readonly featureMessageTemplate?: string;
    readonly releaseMessageTemplate?: string;
    readonly hotfixMessageTemplate?: string;
    readonly releaseTagTemplate?: string;
    readonly hotfixTagTemplate?: string;
    readonly tags!: readonly string[];
    readonly integrations!: readonly IntegrationBase[];
    readonly commitMessageTemplates!: readonly MessageTemplateBase[];
    readonly tagTemplates!: readonly TagTemplateBase[];
    readonly masterBranchName?: string;
    readonly developBranchName?: string;
    readonly dependencies?: readonly (string | Record<string, string>)[]
    readonly labels!: Record<string, string | string[]>;
    readonly annotations!: Record<string, unknown>;

    public calculateHash({ algorithm = 'sha256', encoding = 'hex' }: { algorithm?: string, encoding?: Crypto.BinaryToTextEncoding } = {}) {
        const hash = Crypto.createHash(algorithm);
        this.updateHash(hash);

        return hash.digest(encoding);
    }
    public updateHash(hash: Crypto.Hash) {
        if (this.apiVersion)
            hash.update(this.apiVersion);

        hash.update(this.identifier);

        if (!this.managed)
            hash.update('unmanaged');

        if (this.developVersion)
            hash.update(this.developVersion);
        if (this.masterVersion)
            hash.update(this.masterVersion);

        for (const upstream of this.upstreams) {
            hash.update(upstream.name);
            hash.update(upstream.url);
        }

        for (const include of this.included)
            hash.update(include)
        for (const exclude of this.excluded)
            hash.update(exclude);

        for (const submodule of this.submodules.filter(i => !i.shadow))
            submodule.updateHash(hash);
        for (const feature of this.features.filter(i => !i.shadow))
            feature.updateHash(hash);
        for (const release of this.releases.filter(i => !i.shadow))
            release.updateHash(hash);
        for (const hotfix of this.hotfixes.filter(i => !i.shadow))
            hotfix.updateHash(hash);
        for (const support of this.supports)
            support.updateHash(hash);

        this.featureMessageTemplate && hash.update(this.featureMessageTemplate);
        this.releaseMessageTemplate && hash.update(this.releaseMessageTemplate);
        this.hotfixMessageTemplate && hash.update(this.hotfixMessageTemplate);
        this.releaseTagTemplate && hash.update(this.releaseTagTemplate);
        this.hotfixTagTemplate && hash.update(this.hotfixTagTemplate);

        for (const tag of this.tags)
            hash.update(tag);

        for (const integration of this.integrations)
            integration.updateHash(hash);

        for (const messageTemplate of this.commitMessageTemplates)
            messageTemplate.updateHash(hash);
        for (const tagTemplate of this.tagTemplates)
            tagTemplate.updateHash(hash);

        this.masterBranchName && hash.update(this.masterBranchName);
        this.developBranchName && hash.update(this.developBranchName);

        for (const dependency of this.dependencies ?? [])
            hash.update(JSON.stringify(dependency));

        if (!_.isEmpty(this.labels))
            hash.update(JSON.stringify(this.labels));

        if (!_.isEmpty(this.annotations))
            hash.update(JSON.stringify(this.annotations));

        return this;
    }

    public toHash(stampApiVersion = false) {
        const submodules = this.submodules.filter(i => !i.shadow);
        const features = this.features.filter(i => !i.shadow);
        const releases = this.releases.filter(i => !i.shadow);
        const hotfixes = this.hotfixes.filter(i => !i.shadow);

        return {
            apiVersion: stampApiVersion ? `v${resolveApiVersion()}` : this.apiVersion,
            identifier: this.identifier,
            managed: this.managed === false ? this.managed : undefined,
            developVersion: this.developVersion,
            masterVersion: this.masterVersion,
            upstreams: this.upstreams.length ? this.upstreams.slice() : undefined,
            submodules: submodules.length ? submodules.map(i => i.toHash()) : undefined,
            features: features.length ? features.map(i => i.toHash()) : undefined,
            releases: releases.length ? releases.map(i => i.toHash()) : undefined,
            hotfixes: hotfixes.length ? hotfixes.map(i => i.toHash()) : undefined,
            supports: this.supports.length ? this.supports.map(i => i.toHash()) : undefined,
            included: this.included.length ? this.included.slice() : undefined,
            excluded: this.excluded.length ? this.excluded.slice() : undefined,
            featureMessageTemplate: this.featureMessageTemplate,
            releaseMessageTemplate: this.releaseMessageTemplate,
            hotfixMessageTemplate: this.hotfixMessageTemplate,
            releaseTagTemplate: this.releaseTagTemplate,
            hotfixTagTemplate: this.hotfixTagTemplate,
            tags: this.tags.length ? this.tags.slice() : undefined,
            integrations: this.integrations.length ? this.integrations.map(i => i.toHash()) : undefined,
            commitMessageTemplates: this.commitMessageTemplates.length ? this.commitMessageTemplates.map(i => i.toHash()) : undefined,
            tagTemplates: this.tagTemplates.length ? this.tagTemplates.map(i => i.toHash()) : undefined,
            masterBranchName: this.masterBranchName,
            developBranchName: this.developBranchName,
            dependencies: this.dependencies?.length ? this.dependencies.slice() : undefined,
            labels: _.isEmpty(this.labels) ? undefined : { ...this.labels },
            annotations: _.isEmpty(this.annotations) ? undefined : { ...this.annotations }
        }
    }

    public resolveApiVersion() {
        const version = Semver.coerce(this.apiVersion ?? 'v0.0');
        if (!version)
            throw new Error(`Version "${this.apiVersion ?? 'v0.0'}" is not a valid semver format`);

        return version.toString();
    }
    public resolveVersion(type: 'develop' | 'master' = 'develop') {
        const currentVersion = type === 'develop' ? this.developVersion : this.masterVersion;

        if (!currentVersion)
            return;

        const version = Semver.clean(currentVersion);
        if (!version)
            throw new Error(`Version "${currentVersion}" is not a valid semver format`);

        return version;
    }
}
export class SubmoduleBase {
    readonly name!: string;
    readonly path!: string;
    readonly url?: string;
    readonly tags!: readonly string[];
    readonly labels!: Record<string, string | string[]>;
    readonly annotations!: Record<string, unknown>;

    readonly shadow?: boolean;

    public updateHash(hash: Crypto.Hash) {
        hash.update(this.name);
        hash.update(this.path);
        this.url && hash.update(this.url);

        for (const tag of this.tags)
            hash.update(tag);

        if (!_.isEmpty(this.labels))
            hash.update(JSON.stringify(this.labels));

        if (!_.isEmpty(this.annotations))
            hash.update(JSON.stringify(this.annotations));

        return this;
    }

    public toHash() {
        return {
            name: this.name,
            path: this.path,
            url: this.url,
            tags: this.tags.length ? this.tags.slice() : undefined,
            labels: _.isEmpty(this.labels) ? undefined : { ...this.labels },
            annotations: _.isEmpty(this.annotations) ? undefined : { ...this.annotations }
        }
    }
}
export class FeatureBase {
    readonly name!: string;
    readonly branchName!: string;
    readonly sourceSha!: string;
    readonly upstream?: string;
    readonly version?: string;
    readonly tags!: TaggingBase[];

    readonly shadow?: boolean;

    public updateHash(hash: Crypto.Hash) {
        hash.update(this.name);
        hash.update(this.branchName);
        hash.update(this.sourceSha);

        if (this.version)
            hash.update(this.version);

        this.upstream && hash.update(this.upstream);

        for (const tag of this.tags)
            tag.updateHash(hash);

        return this;
    }

    public toHash() {
        return {
            name: this.name,
            branchName: this.branchName,
            sourceSha: this.sourceSha,
            version: this.version,
            upstream: this.upstream
        }
    }

    public resolveVersion() {
        if (!this.version)
            return;

        const version = Semver.clean(this.version);
        if (!version)
            throw new Error(`Version "${this.version}" is not a valid semver format`);

        return version;
    }
}
export class ReleaseBase {
    readonly name!: string;
    readonly branchName!: string;
    readonly sourceSha!: string;
    readonly version?: string;
    readonly upstream?: string;
    readonly intermediate!: boolean;
    readonly tags!: TaggingBase[];

    readonly shadow?: boolean;

    public updateHash(hash: Crypto.Hash) {
        hash.update(this.name);
        hash.update(this.branchName);
        hash.update(this.sourceSha);

        if (this.version)
            hash.update(this.version);

        this.upstream && hash.update(this.upstream);

        hash.update(this.intermediate.toString());

        for (const tag of this.tags)
            tag.updateHash(hash);

        return this;
    }

    public toHash() {
        return {
            name: this.name,
            branchName: this.branchName,
            sourceSha: this.sourceSha,
            version: this.version,
            upstream: this.upstream,
            intermediate: this.intermediate
        }
    }

    public resolveVersion() {
        if (!this.version)
            return;

        const version = Semver.clean(this.version);
        if (!version)
            throw new Error(`Version "${this.version}" is not a valid semver format`);

        return version;
    }
}
export class HotfixBase {
    readonly name!: string;
    readonly branchName!: string;
    readonly sourceSha!: string;
    readonly version?: string;
    readonly upstream?: string;
    readonly intermediate!: boolean;
    readonly tags!: TaggingBase[];

    readonly shadow?: boolean;

    public updateHash(hash: Crypto.Hash) {
        hash.update(this.name);
        hash.update(this.branchName);
        hash.update(this.sourceSha);

        if (this.version)
            hash.update(this.version);

        this.upstream && hash.update(this.upstream);

        hash.update(this.intermediate.toString());

        for (const tag of this.tags)
            tag.updateHash(hash);

        return this;
    }

    public toHash() {
        return {
            name: this.name,
            branchName: this.branchName,
            sourceSha: this.sourceSha,
            version: this.version,
            upstream: this.upstream,
            intermediate: this.intermediate
        }
    }

    public resolveVersion() {
        if (!this.version)
            return;

        const version = Semver.clean(this.version);
        if (!version)
            throw new Error(`Version "${this.version}" is not a valid semver format`);

        return version;
    }
}
export class SupportBase {
    readonly name!: string;
    readonly masterBranchName!: string;
    readonly developBranchName!: string;
    readonly sourceSha!: string;
    readonly developVersion?: string;
    readonly masterVersion?: string;
    readonly upstream?: string;

    readonly features!: readonly FeatureBase[];
    readonly releases!: readonly ReleaseBase[];
    readonly hotfixes!: readonly HotfixBase[];

    public updateHash(hash: Crypto.Hash) {
        hash.update(this.name);
        hash.update(this.masterBranchName);
        hash.update(this.developBranchName);
        hash.update(this.sourceSha);

        if (this.developVersion)
            hash.update(this.developVersion);
        if (this.masterVersion)
            hash.update(this.masterVersion);

        this.upstream && hash.update(this.upstream);

        for (const feature of this.features.filter(i => !i.shadow))
            feature.updateHash(hash);
        for (const release of this.releases.filter(i => !i.shadow))
            release.updateHash(hash);
        for (const hotfix of this.hotfixes.filter(i => !i.shadow))
            hotfix.updateHash(hash);

        return this;
    }

    public toHash() {
        const features = this.features.filter(i => !i.shadow);
        const releases = this.releases.filter(i => !i.shadow);
        const hotfixes = this.hotfixes.filter(i => !i.shadow);

        return {
            name: this.name,
            masterBranchName: this.masterBranchName,
            developBranchName: this.developBranchName,
            sourceSha: this.sourceSha,
            developVersion: this.developVersion,
            masterVersion: this.masterVersion,
            upstream: this.upstream,
            features: features.length ? features.map(i => i.toHash()) : undefined,
            releases: releases.length ? releases.map(i => i.toHash()) : undefined,
            hotfixes: hotfixes.length ? hotfixes.map(i => i.toHash()) : undefined
        }
    }

    public resolveVersion(type: 'develop' | 'master' = 'develop') {
        const currentVersion = type === 'develop' ? this.developVersion : this.masterVersion;

        if (!currentVersion)
            return;

        const version = Semver.clean(currentVersion);
        if (!version)
            throw new Error(`Version "${currentVersion}" is not a valid semver format`);

        return version;
    }
}

export class IntegrationBase {
    readonly plugin!: string;
    readonly options!: Record<string, unknown>;

    public updateHash(hash: Crypto.Hash) {
        hash.update(this.plugin);

        hash.update(JSON.stringify(this.options))

        return this;
    }

    public toHash() {
        return {
            plugin: this.plugin,
            options: _.isEmpty(this.options) ? undefined : { ...this.options }
        }
    }
}

export class TaggingBase {
    readonly name!: string;
    readonly annotation?: string;

    public updateHash(hash: Crypto.Hash) {
        hash.update(this.name);

        if (this.annotation)
            hash.update(this.annotation);

        return this;
    }

    public toHash() {
        return {
            name: this.name,
            annotation: this.annotation
        }
    }
}

export class MessageTemplateBase {
    readonly name!: string;
    readonly message!: string;

    public updateHash(hash: Crypto.Hash) {
        hash.update(this.name);
        hash.update(this.message);

        return this;
    }

    public toHash() {
        return {
            name: this.name,
            message: this.message
        }
    }
}
export class TagTemplateBase {
    readonly name!: string;
    readonly tag!: string;
    readonly annotation?: string;

    public updateHash(hash: Crypto.Hash) {
        hash.update(this.name);
        hash.update(this.tag);
        this.annotation && hash.update(this.annotation);

        return this;
    }

    public toHash() {
        return {
            name: this.name,
            tag: this.tag,
            annotation: this.annotation
        }
    }
}

export const ConfigUriSchema = Zod.string().url().transform(value => {
    const parts = value.split('://');

    return Zod.object({
        protocol: Zod.union([
            Zod.literal('config'),
            Zod.literal('file'),
            Zod.literal('branch'),
            Zod.literal('http'),
            Zod.literal('https'),
            Zod.literal('glfs')
        ]),
        qualifier: Zod.string()
    }).parse({
        protocol: parts[0],
        qualifier: parts[1]
    });
});

export type ConfigReference = {
    type: 'config';
} | {
    type: 'file';
    path: string;
} | {
    type: 'branch';
    branchName: string;
} | {
    type: 'http';
    protocol: string;
    url: string;
} | {
    type: 'glfs';
    hostname?: string;
    namespace: string;
    name: string;
    support?: string;
}
export function parseConfigReference(uri: string): ConfigReference {
    const { protocol, qualifier } = ConfigUriSchema.parse(uri);

    if (protocol === 'config') {
        return {
            type: protocol
        }
    }
    else if (protocol === 'file') {
        return {
            type: protocol,
            path: qualifier
        }
    }
    else if (protocol === 'branch') {
        return {
            type: protocol,
            branchName: qualifier
        }
    }
    else if (protocol === 'http' || protocol === 'https') {
        return {
            type: 'http',
            protocol,
            url: qualifier
        }
    }
    else if (protocol === 'glfs') {
        const parts = qualifier.split('/');

        if (parts.length === 4) {
            return {
                type: protocol,
                hostname: parts[0],
                namespace: parts[1],
                name: parts[2],
                support: parts[3]
            }
        }
        else if (parts.length === 3) {
            return {
                type: protocol,
                hostname: parts[0],
                namespace: parts[1],
                name: parts[2]
            }
        }
        else if (parts.length === 2) {
            return {
                type: protocol,
                namespace: parts[0],
                name: parts[1]
            }
        }
        else {
            throw new Error(`GLFS Uri invalid [${uri}]`)
        }
    }

    throw new Error(`Unsupported config protocol ${protocol}`);
}

export const ElementSchema = Zod.tuple([
    Zod.union([
        Zod.literal('branch'),
        Zod.literal('repo'),
        Zod.literal('feature'),
        Zod.literal('release'),
        Zod.literal('hotfix'),
        Zod.literal('support')
    ]),
    Zod.string()
]);

export const ElementUriSchema = Zod.string().url().transform(value => {
    const parts = value.split('://');

    return Zod.object({
        type: Zod.union([
            Zod.literal('feature'),
            Zod.literal('release'),
            Zod.literal('hotfix'),
            Zod.literal('support')
        ]),
        qualifier: Zod.string()
    }).parse({
        type: parts[0],
        qualifier: parts[1]
    });
});
export function parseElementUri(uri: string) {
    return ElementUriSchema.parse(uri);
}
