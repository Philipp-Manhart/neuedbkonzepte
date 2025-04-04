'use client';
import { useState, useEffect, useRef } from 'react';
import ScaleQuestion from './question-types/ScaleQuestion';
import SingleChoiceQuestion from './question-types/SingleChoiceQuestion';
import MultipleChoiceQuestion from './question-types/MultipleChoiceQuestion';
import YesNoQuestion from './question-types/YesNoQuestion';
import { useCurrentQuestionSSE } from '@/hooks/use-current-question-sse';
import { updateCurrentQuestion } from '@/app/actions/poll_run';
import { Button } from './ui/button';
import { endPollRun } from '@/app/actions/poll_run';
import { toast } from 'sonner';

interface QuestionDisplayProps {
	questions: any[];
	pollRunId: string;
	defaultDuration: number;
	isOwner?: boolean;
}

export default function QuestionDisplay({
	questions,
	pollRunId,
	defaultDuration,
	isOwner = false,
}: QuestionDisplayProps) {
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [timeLeft, setTimeLeft] = useState<number>(parseInt(defaultDuration as any) || 30);
	const [pollCompleted, setPollCompleted] = useState(false);
	const [isAdvancing, setIsAdvancing] = useState(false);
	const [isEnding, setIsEnding] = useState(false);

	const updateInProgress = useRef(false);
	const timerRef = useRef<NodeJS.Timeout | null>(null);

	// SSE hook to listen for question updates
	const { currentQuestionIndex: sseQuestionIndex, error: sseError } = useCurrentQuestionSSE(pollRunId, (data) => {
		const newIndex = parseInt(data.currentQuestionIndex);
		if (newIndex !== currentQuestionIndex) {
			setTimeLeft(defaultDuration);
		}
	});

	// When the SSE index changes update local state
	useEffect(() => {
		// Only update if the SSE index is different from our current index
		if (sseQuestionIndex !== currentQuestionIndex) {
			setCurrentQuestionIndex(sseQuestionIndex);
			setTimeLeft(defaultDuration);

			// Check if we've completed the poll
			if (sseQuestionIndex >= questions.length) {
				setPollCompleted(true);
			}
		}
	}, [sseQuestionIndex, currentQuestionIndex, questions.length, defaultDuration]);

	const currentQuestion = currentQuestionIndex < questions.length ? questions[currentQuestionIndex] : null;

	// Function to advance to the next question (for timer or manual navigation)
	const advanceToNextQuestion = async () => {
		if (updateInProgress.current || isAdvancing) return;

		setIsAdvancing(true);
		updateInProgress.current = true;

		if (timerRef.current) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}

		if (currentQuestionIndex < questions.length - 1) {

			if (isOwner) {
				// If the user is the poll owner, use the server action to update the question
				const result = await updateCurrentQuestion(pollRunId, 'next');
				if (!result.success) {
					console.error('Fehler beim Laden der nächsten Frage:', result.error);
				}
			} else {
				// For participants just update the local state
				setCurrentQuestionIndex((prev) => prev + 1);
				setTimeLeft(defaultDuration);
			}
		} else {
			setPollCompleted(true);
		}

		// Allow updates again after a short delay
		setTimeout(() => {
			updateInProgress.current = false;
			setIsAdvancing(false);
		}, 50);
	};

	// End Poll Run
	const handleEndPollRun = async () => {
		if (updateInProgress.current || isAdvancing || !isOwner) return;

		setIsEnding(true);
		updateInProgress.current = true;

		const result = await endPollRun(pollRunId);
		if (!result.success) {
			toast.error("Durchlauf konnte nicht beendet werden.")
		}

		setTimeout(() => {
			updateInProgress.current = false;
			setIsEnding(false);
		}, 50);
	};

	// Timer effect
	useEffect(() => {
		if (pollCompleted || !questions.length || currentQuestionIndex >= questions.length) {
			return;
		}

		if (timerRef.current) {
			clearInterval(timerRef.current);
		}

		timerRef.current = setInterval(() => {
			setTimeLeft((prevTime) => {
				const newTime = prevTime - 1;

				if (newTime <= 0) {
					// If timer ends and user is an owner, advance the question on the server
					if (isOwner) {
						setTimeout(advanceToNextQuestion, 10);
					}
					return 0;
				}
				return newTime;
			});
		}, 1000);

		return () => {
			if (timerRef.current) {
				clearInterval(timerRef.current);
				timerRef.current = null;
			}
		};
	}, [pollCompleted, questions.length, currentQuestionIndex, isOwner]);

	if (!questions || questions.length === 0) {
		return <div className="flex justify-center items-center h-screen">Keine Fragen verfügbar.</div>;
	}


	if (!currentQuestion) {
		return <div className="flex justify-center items-center h-screen">Lade Fragen...</div>;
	}

	const options = currentQuestion.possibleAnswers || [];

	const renderQuestionComponent = () => {
		switch (currentQuestion.type) {
			case 'scale':
				return (
					<ScaleQuestion
						questionId={currentQuestion.questionId}
						questionText={currentQuestion.questionText}
						pollRunId={pollRunId}
						isOwner={isOwner}
					/>
				);
			case 'single-choice':
				return (
					<SingleChoiceQuestion
						questionId={currentQuestion.questionId}
						questionText={currentQuestion.questionText}
						options={options}
						pollRunId={pollRunId}
						isOwner={isOwner}
					/>
				);
			case 'multiple-choice':
				return (
					<MultipleChoiceQuestion
						questionId={currentQuestion.questionId}
						questionText={currentQuestion.questionText}
						options={options}
						pollRunId={pollRunId}
						isOwner={isOwner}
					/>
				);
			case 'yes-no':
				return (
					<YesNoQuestion
						questionId={currentQuestion.questionId}
						questionText={currentQuestion.questionText}
						pollRunId={pollRunId}
						isOwner={isOwner}
					/>
				);
			default:
				return (
					<div>
						<h3 className="text-xl font-semibold mb-4">{currentQuestion.questionText}</h3>
						<p>Question Type: {currentQuestion.type}</p>
						{options.length > 0 && (
							<ul className="space-y-2 mt-4">
								{options.map((option, index) => (
									<li key={index} className="border p-3 rounded-md">
										{option}
									</li>
								))}
							</ul>
						)}
					</div>
				);
		}
	};

	return (
		<div className="flex flex-col justify-center items-center min-h-screen p-4">
			<div className="w-full max-w-lg">
				<div className="mb-8 text-center">
					<h2 className="text-2xl font-bold mb-2">
						Question {currentQuestionIndex + 1} of {questions.length}
					</h2>
					<div className="h-2 w-full rounded-full">
						<div
							className="bg-amber-500 h-2 rounded-full"
							style={{ width: `${((currentQuestionIndex + 1) * 100) / questions.length}%` }}></div>
					</div>
				</div>

				<div className="shadow-md rounded-lg p-6 mb-6">{renderQuestionComponent()}</div>

				<div className="text-center">
					<div className="text-xl font-bold">verbleibende Zeit: {timeLeft} Sekunden</div>
					<div className="h-3 w-full rounded-full mt-2">
						<div
							className="bg-green-500 h-3 rounded-full transition-all duration-1000"
							style={{ width: `${(timeLeft * 100) / (parseInt(defaultDuration as any) || 30)}%` }}></div>
					</div>

					{/* Navigation controls for poll owner */}
					{isOwner && (
						<div className="flex justify-between mt-6">
							<Button
								onClick={handleEndPollRun}
								disabled={isEnding || isAdvancing}>
								Umfragedurchlauf beenden
							</Button>

							<Button
								onClick={advanceToNextQuestion}
								disabled={currentQuestionIndex >= questions.length - 1 || isAdvancing}>
								Nächste Frage
							</Button>
						</div>
					)}

					{/* Display SSE error if any */}
					{sseError && <div className="mt-4 p-2 bg-red-100 text-red-700 rounded">Connection error: {sseError}</div>}
				</div>
			</div>
		</div>
	);
}
