function generateLotto() {
  const numbers = [];

  while (numbers.length < 7) {
    const num = Math.floor(Math.random() * 45) + 1;
    if (!numbers.includes(num)) {
      numbers.push(num);
    }
  }

  const mainNumbers = numbers.slice(0, 6).sort((a, b) => a - b);
  const bonusNumber = numbers[6];

  const balls = document.querySelectorAll('.ball');

  balls.forEach((ball, index) => {
    ball.classList.remove('active', 'range1', 'range2', 'range3', 'range4', 'range5');

    setTimeout(() => {
      let num;
      if (index < 6) {
        num = mainNumbers[index];
      } else {
        num = bonusNumber;
      }

      ball.textContent = num;
      ball.classList.add('active');
      ball.classList.add(getColorClass(num));
    }, index * 100);
  });

  setTimeout(() => {
    addToHistory(mainNumbers, bonusNumber);
  }, 700);
}

function getColorClass(num) {
  if (num <= 10) return 'range1';
  if (num <= 20) return 'range2';
  if (num <= 30) return 'range3';
  if (num <= 40) return 'range4';
  return 'range5';
}

function addToHistory(mainNumbers, bonusNumber) {
  const historyList = document.getElementById('historyList');
  const li = document.createElement('li');

  const now = new Date();
  const time = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  li.textContent = `[${time}] ${mainNumbers.join(', ')} + ${bonusNumber}`;

  historyList.insertBefore(li, historyList.firstChild);

  if (historyList.children.length > 10) {
    historyList.removeChild(historyList.lastChild);
  }
}
