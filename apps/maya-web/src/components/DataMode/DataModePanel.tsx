import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Save, Check, RotateCcw, ArrowUp, MessageSquare, ChevronDown, ChevronRight, Download } from 'lucide-react';
import type { DifficultyLevel, CommandLogEntry } from '@maya/rl-core/types';
import type { WorkspaceSnapshot } from '@maya/workspace-domain/workspace/core';
import type { WorkspaceHandle } from '../Workspace/types';
import type { PromptStepInput } from '@maya/rl-core/dataCollector';
import {
    createTrainingExample,
    downloadExample,
    saveExampleToStorage,
    getExampleCount,
    generateExampleId,
    clearStoredExamples,
    filterCommandLog,
    getStoredExamples,
    exportAsTinkerSFT,
} from '@maya/rl-core/dataCollector';

interface DataModePanelProps {
    workspace: WorkspaceHandle;
}

interface PromptStep extends PromptStepInput { }

type TimelineItem =
    | { kind: 'prompt'; data: PromptStep }
    | { kind: 'command'; data: CommandLogEntry };

const createPromptStep = (text: string): PromptStep => ({
    id: `prompt-${generateExampleId()}`,
    text,
    timestamp: Date.now(),
});

const CommandGroup: React.FC<{ commands: CommandLogEntry[] }> = ({ commands }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [limit, setLimit] = useState(5);

    // Filter out cursor movements for display - these are noise
    const meaningfulCommands = useMemo(() => 
        filterCommandLog(commands),
        [commands]
    );
    
    const cursorMoveCount = commands.length - meaningfulCommands.length;
    const visibleCommands = meaningfulCommands.slice(0, limit);
    const hasMore = meaningfulCommands.length > limit;

    if (meaningfulCommands.length === 0 && cursorMoveCount === 0) return null;

    return (
        <div className="chat-bubble info" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#F8F9FA', border: '1px solid #EBEAED', width: '100%' }}>
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    background: isExpanded ? '#F1F0F5' : 'transparent'
                }}
            >
                {isExpanded ? <ChevronDown size={14} className="icon" /> : <ChevronRight size={14} className="icon" />}
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6F62A4' }}>
                    {meaningfulCommands.length} Actions
                    {cursorMoveCount > 0 && (
                        <span style={{ fontWeight: 400, color: '#999', marginLeft: '4px' }}>
                            ({cursorMoveCount} cursor moves filtered)
                        </span>
                    )}
                </span>
            </div>

            {isExpanded && (
                <div style={{ borderTop: '1px solid #EBEAED' }}>
                    {visibleCommands.map((cmd, idx) => {
                        const { command } = cmd;
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { type, ...payload } = command as any;
                        const typeName = typeof type === 'string' ? type.replace('workspace/', '') : 'unknown';

                        return (
                            <div key={cmd.id} style={{
                                padding: '6px 12px',
                                borderBottom: '1px solid #F3F3F3',
                                fontSize: '0.7rem',
                                fontFamily: 'monospace',
                                display: 'flex',
                                gap: '8px',
                                alignItems: 'flex-start'
                            }}>
                                <span style={{ color: '#9B8BB7', minWidth: '16px' }}>{idx + 1}.</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, color: '#4B4B4B' }}>{typeName}</div>
                                    <div style={{ color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {JSON.stringify(payload)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {hasMore && (
                        <div style={{ padding: '8px', display: 'flex', gap: '8px', justifyContent: 'center', background: '#FAFAFA' }}>
                            <button
                                onClick={() => setLimit(prev => prev + 5)}
                                style={{
                                    fontSize: '0.7rem',
                                    color: '#6F62A4',
                                    background: 'white',
                                    border: '1px solid #EBEAED',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Show 5 More
                            </button>
                            <button
                                onClick={() => setLimit(commands.length)}
                                style={{
                                    fontSize: '0.7rem',
                                    color: '#6F62A4',
                                    background: 'white',
                                    border: '1px solid #EBEAED',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Show All
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const DataModePanel: React.FC<DataModePanelProps> = ({ workspace }) => {
    const [promptSteps, setPromptSteps] = useState<PromptStep[]>([]);
    const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [difficulty, setDifficulty] = useState<DifficultyLevel>('level-1');
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const [exampleCount, setExampleCount] = useState(0);
    const [initialSnapshot, setInitialSnapshot] = useState<WorkspaceSnapshot | null>(null);
    const [sessionId, setSessionId] = useState(() => generateExampleId());
    const [error, setError] = useState<string | null>(null);

    // Track the number of commands we've already processed into the timeline
    const processedCommandCountRef = useRef(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setExampleCount(getExampleCount());
    }, []);

    // Initialize session
    useEffect(() => {
        if (!initialSnapshot) {
            setInitialSnapshot(workspace.getSnapshot());
            workspace.resetCommandLog();
            processedCommandCountRef.current = 0;
        }

        const unsubscribe = workspace.subscribeToCommandLog(() => {
            const allCommands = workspace.getCommandLog();
            const newCount = allCommands.length;
            const prevCount = processedCommandCountRef.current;

            if (newCount > prevCount) {
                const newCommands = allCommands.slice(prevCount);
                setTimelineItems(prev => [
                    ...prev,
                    ...newCommands.map(cmd => ({ kind: 'command' as const, data: cmd }))
                ]);
                processedCommandCountRef.current = newCount;
                scrollToBottom();
            }
        });

        return () => {
            unsubscribe?.();
        };
    }, [workspace, initialSnapshot]);

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }, 50);
    };

    const handleAddPrompt = () => {
        if (!inputValue.trim()) return;

        const newStep = createPromptStep(inputValue.trim());
        setPromptSteps(prev => [...prev, newStep]);
        setTimelineItems(prev => [...prev, { kind: 'prompt', data: newStep }]);
        setInputValue('');
        scrollToBottom();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAddPrompt();
        }
    };

    const resetSession = useCallback(() => {
        setPromptSteps([]);
        setTimelineItems([]);
        setSessionId(generateExampleId());
        workspace.resetCommandLog();
        processedCommandCountRef.current = 0;
        setInitialSnapshot(workspace.getSnapshot());
        setError(null);
        setSaved(false);
    }, [workspace]);

    const handleSave = useCallback(async () => {
        if (saving) return;
        if (promptSteps.length === 0) {
            setError('Please add at least one prompt step before saving.');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const finalSnapshot = workspace.getSnapshot();
            const example = await createTrainingExample({
                sessionId,
                promptSteps,
                initialSnapshot: initialSnapshot ?? workspace.getSnapshot(),
                finalSnapshot,
                commandLog: workspace.getCommandLog(),
                difficulty,
            });

            saveExampleToStorage(example);
            downloadExample(example);

            setExampleCount((prev) => prev + 1);
            setSaved(true);
            setTimeout(() => {
                setSaved(false);
                resetSession();
            }, 2000);
        } catch (err) {
            // Error handled - file system operation failed
            setError(err instanceof Error ? err.message : 'Failed to save example');
        } finally {
            setSaving(false);
        }
    }, [difficulty, initialSnapshot, promptSteps, resetSession, saving, sessionId, workspace]);

    const groupedTimeline = useMemo(() => {
        const groups: { id: string; prompt: PromptStep | null; commands: CommandLogEntry[] }[] = [];
        let currentGroup: typeof groups[0] | null = null;

        timelineItems.forEach((item) => {
            if (item.kind === 'prompt') {
                currentGroup = {
                    id: item.data.id,
                    prompt: item.data,
                    commands: [],
                };
                groups.push(currentGroup);
            } else if (item.kind === 'command') {
                if (!currentGroup) {
                    // Handle commands before any prompt
                    currentGroup = {
                        id: 'pre-prompt',
                        prompt: null,
                        commands: [],
                    };
                    groups.push(currentGroup);
                }
                currentGroup.commands.push(item.data);
            }
        });
        return groups;
    }, [timelineItems]);

    return (
        <aside className="chat-panel">
            <div className="chat-header">
                <div className="chat-tab" style={{ background: '#E0D8F3', color: '#6F62A4' }}>
                    Data Collection
                </div>
                <div className="chat-header-actions">
                    <button
                        onClick={() => {
                            const examples = getStoredExamples();
                            if (examples.length === 0) {
                                alert('No saved examples to export. Save some examples first.');
                                return;
                            }
                            exportAsTinkerSFT(examples, true);
                        }}
                        className="icon-toggle"
                        title="Export as Tinker SFT (JSONL)"
                        style={{ color: '#6F62A4' }}
                    >
                        <Download size={16} />
                    </button>
                    <button
                        onClick={resetSession}
                        className="icon-toggle"
                        title="Reset Session"
                        style={{ color: '#6F62A4' }}
                    >
                        <RotateCcw size={16} />
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saved || saving || promptSteps.length === 0}
                        className="icon-toggle"
                        title="Save Example"
                        style={{
                            color: saved ? '#4ADE80' : '#6F62A4',
                            opacity: (saving || promptSteps.length === 0) ? 0.5 : 1
                        }}
                    >
                        {saved ? <Check size={16} /> : <Save size={16} />}
                    </button>
                </div>
            </div>

            <div className="chat-log" ref={scrollRef}>
                <div className="chat-content-wrapper" style={{ padding: '16px' }}>
                    {timelineItems.length === 0 && (
                        <div className="chat-bubble info">
                            <MessageSquare className="icon" />
                            <span>
                                Start by entering a prompt below to describe the task.
                                Then perform actions in the workspace.
                                Commands will be logged here automatically.
                            </span>
                        </div>
                    )}

                    {groupedTimeline.map(group => (
                        <React.Fragment key={group.id}>
                            {group.prompt && (
                                <div className="chat-bubble user">
                                    {group.prompt.text}
                                </div>
                            )}
                            {group.commands.length > 0 && (
                                <CommandGroup commands={group.commands} />
                            )}
                        </React.Fragment>
                    ))}

                    {error && (
                        <div className="chat-bubble info" style={{ background: '#FEE2E2', color: '#DC2626' }}>
                            <span>{error}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="chat-input-container">
                <div className="chat-input-wrapper">
                    <div className="chat-input-top">
                        <div className="agent-selector">
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#666' }}>Difficulty:</span>
                            <select
                                value={difficulty}
                                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    color: '#6F62A4',
                                    outline: 'none',
                                    cursor: 'pointer',
                                }}
                            >
                                <option value="level-1">Level 1 (Simple)</option>
                                <option value="level-2">Level 2 (Features)</option>
                                <option value="level-3">Level 3 (Complex)</option>
                                <option value="level-4">Level 4 (Advanced)</option>
                            </select>
                        </div>
                        <div className="token-usage" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.7rem', color: '#999' }}>{exampleCount} saved</span>
                            <button
                                onClick={() => {
                                    if (window.confirm(`Reset counter? This will clear the count of ${exampleCount} saved examples from storage.`)) {
                                        clearStoredExamples();
                                        setExampleCount(0);
                                    }
                                }}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#999',
                                    cursor: 'pointer',
                                    padding: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    fontSize: '0.65rem',
                                }}
                                title="Reset counter and clear stored examples"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    <div className="chat-input-main">
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Describe the next step..."
                            rows={2}
                        />
                    </div>

                    <div className="chat-input-bottom">
                        <div /> {/* Spacer */}
                        <div className="chat-input-actions">
                            <div
                                className="send-button"
                                onClick={handleAddPrompt}
                                style={{
                                    background: inputValue.trim() ? '#6F62A4' : '#E0E0E0',
                                    cursor: inputValue.trim() ? 'pointer' : 'default'
                                }}
                            >
                                <ArrowUp className="icon" style={{ color: inputValue.trim() ? '#FFF' : '#9A9A9A' }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};
